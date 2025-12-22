# Chat Attachment Support Implementation Plan

## Overview

Add file attachment support to the chat interface, allowing users to upload images, PDFs, and text files alongside their messages.

## Current Architecture Summary

### AI SDK v6 Attachment Support

The `useChat` hook supports attachments via `sendMessage()`:

```typescript
// FileList approach (from input element)
sendMessage({ text: input, files: fileList });

// FileUIPart approach (manual construction)
sendMessage({
  text: input,
  files: [{
    type: 'file',
    filename: 'photo.png',
    mediaType: 'image/png',
    url: 'https://cdn.example.com/photo.png'  // or data URL
  }]
});
```

Attachments appear in `message.parts` as:
```typescript
{
  type: 'file',
  filename: string,
  mediaType: string,
  url: string
}
```

### Server-Side Processing

When `convertToModelMessages()` processes file parts:
- Images (`image/*`) → converted to `{ type: 'image', image: url }` for the model
- Text (`text/*`) → converted to text content for the model
- Other files → may require custom handling

### Existing Infrastructure

- **Upload API**: `/api/upload` - uploads to R2, returns public URL
- **S3 Service**: `uploadFile()`, `uploadBase64File()` in `src/lib/services/s3/`
- **Image Gallery**: `image_operation` table tracks all images
- **CDN**: Cloudflare R2 with custom domain for public URLs

---

## Implementation Plan

### Phase 1: Attachment Button & Dialog

#### 1.1 Create AttachmentDialog Component

**File**: `src/components/chat/attachment-dialog.tsx`

```typescript
interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: ProcessedAttachment[]) => void;
}

interface ProcessedAttachment {
  id: string;           // Unique ID for tracking
  file: File;           // Original file
  preview?: string;     // Data URL for preview (images only)
  type: 'image' | 'document';
  status: 'pending' | 'uploading' | 'ready' | 'error';
  url?: string;         // CDN URL after upload
  error?: string;
}
```

Features:
- Dropzone with drag-and-drop support
- File picker fallback (click to browse)
- Accept: `image/*`, `application/pdf`, `text/plain`, `text/markdown`, `.md`
- Multi-file support
- Preview grid showing selected files
- File size validation (10MB per file, configurable)
- Remove individual files before confirming

#### 1.2 Add Attachment Button to Chat Input

**Files**: `src/components/draft-chatbot.tsx`, `src/components/persistent-chatbot.tsx`

Add a paperclip button to the left of the textarea:

```tsx
<div className="flex gap-2 items-end">
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={() => setAttachmentDialogOpen(true)}
    disabled={isLoading}
  >
    <Paperclip className="h-4 w-4" />
  </Button>
  <Textarea ... />
  <Button type="submit">Send</Button>
</div>
```

#### 1.3 Drag-and-Drop on Chat Area

Add drop zone to the entire chat messages container:

```tsx
const [isDraggingOver, setIsDraggingOver] = useState(false);

<div
  ref={messagesContainerRef}
  className={cn(
    "flex-1 overflow-y-auto",
    isDraggingOver && "ring-2 ring-primary ring-inset bg-primary/5"
  )}
  onDragOver={(e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }}
  onDragLeave={() => setIsDraggingOver(false)}
  onDrop={(e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFileDrop(e.dataTransfer.files);
  }}
>
  {/* messages */}
</div>
```

When files are dropped:
- Process files (resize images, validate types)
- Add to `pendingAttachments` state
- Show in preview bar above input

---

### Phase 2: Attachment Preview & State Management

#### 2.1 Pending Attachments State

Add to both chatbot components:

```typescript
const [pendingAttachments, setPendingAttachments] = useState<ProcessedAttachment[]>([]);
```

#### 2.2 Attachment Preview Bar

**File**: `src/components/chat/attachment-preview-bar.tsx`

Display thumbnails above the input when files are pending:

```tsx
interface AttachmentPreviewBarProps {
  attachments: ProcessedAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}
```

Features:
- Horizontal scrollable container
- Image thumbnails with aspect ratio preservation
- Document icon for PDFs/text files
- File name truncation
- Remove button (X) on each thumbnail
- Upload progress indicator per file
- Error state styling

---

### Phase 3: Client-Side Image Processing

#### 3.1 Image Resizer Utility

**File**: `src/lib/utils/image-resize.ts`

```typescript
interface ResizeOptions {
  maxWidth?: number;      // Default: 2048
  maxHeight?: number;     // Default: 2048
  quality?: number;       // 0-1, default: 0.85
  format?: 'jpeg' | 'webp' | 'png';  // Default: 'jpeg'
}

async function resizeImage(file: File, options?: ResizeOptions): Promise<Blob>
```

Implementation:
- Use HTML Canvas API for resizing
- Preserve aspect ratio
- Convert to JPEG/WebP for smaller file sizes
- Target max dimension of 2048px (sufficient for vision models)
- Maintain EXIF orientation

#### 3.2 Process Attachments Before Upload

When files are selected in the dialog:

```typescript
async function processAttachments(files: File[]): Promise<ProcessedAttachment[]> {
  return Promise.all(files.map(async (file) => {
    const id = crypto.randomUUID();

    if (file.type.startsWith('image/')) {
      // Resize if needed
      const resized = await resizeImage(file, { maxWidth: 2048, maxHeight: 2048 });
      const preview = await blobToDataUrl(resized);

      return {
        id,
        file: new File([resized], file.name, { type: 'image/jpeg' }),
        preview,
        type: 'image',
        status: 'pending',
      };
    }

    return {
      id,
      file,
      type: 'document',
      status: 'pending',
    };
  }));
}
```

---

### Phase 4: Upload Flow

#### 4.1 Enhanced Upload API

**File**: `src/app/api/upload/route.ts` (modify existing)

Add support for:
- Chat context (optional `chatId` in form data)
- Automatic image_operation creation for images
- Return structured response with file metadata

```typescript
interface UploadResponse {
  uploads: Array<{
    id: string;          // image_operation ID (for images) or generated UUID
    filename: string;
    url: string;
    key: string;
    size: number;
    mediaType: string;
    isImage: boolean;
  }>;
}
```

#### 4.2 Upload on Send (Optimistic)

When user clicks Send:

1. Start uploading all pending attachments in parallel
2. Update attachment status to 'uploading'
3. On success: update status to 'ready', store URL
4. On all ready: send message with file parts
5. On error: show toast, keep attachments for retry

```typescript
async function handleSubmit() {
  if (pendingAttachments.length > 0) {
    // Upload all files first
    const uploaded = await uploadAttachments(pendingAttachments);

    // Build file parts for sendMessage
    const files = uploaded.map(att => ({
      type: 'file' as const,
      filename: att.file.name,
      mediaType: att.file.type,
      url: att.url,
    }));

    sendMessage({ text: input, files });
    setPendingAttachments([]);
  } else {
    sendMessage({ text: input });
  }
  setInput('');
}
```

---

### Phase 5: Add Images to Gallery

#### 5.1 Create image_operation Record

When uploading images via chat:

```typescript
// In /api/upload or dedicated endpoint
if (file.type.startsWith('image/')) {
  await db.insert(imageOperation).values({
    id: uuidv4(),
    userId: session.user.id,
    chatId: chatId || null,  // Optional chat context
    operationType: 'upload',
    outputUrl: publicUrl,
    outputKey: key,
    outputSize: size,
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
```

This ensures all chat-uploaded images appear in `/dashboard/images`.

---

### Phase 6: Message Rendering

#### 6.1 Render File Parts in User Messages

**Files**: `src/components/draft-chatbot.tsx`, `src/components/persistent-chatbot.tsx`

Add rendering for file parts in message display:

```tsx
{message.parts.map((part, i) => {
  if (part.type === 'text') {
    // Existing text rendering
  }

  if (part.type === 'file') {
    const filePart = part as { type: 'file'; filename: string; mediaType: string; url: string };

    if (filePart.mediaType.startsWith('image/')) {
      return (
        <div key={i} className="mt-2">
          <Image
            src={filePart.url}
            alt={filePart.filename}
            width={300}
            height={200}
            className="rounded-lg object-cover"
          />
        </div>
      );
    }

    // Document attachment
    return (
      <a
        key={i}
        href={filePart.url}
        target="_blank"
        className="flex items-center gap-2 mt-2 p-2 rounded bg-muted"
      >
        <FileText className="h-4 w-4" />
        <span className="text-sm truncate">{filePart.filename}</span>
      </a>
    );
  }
})}
```

#### 6.2 Create Reusable Attachment Renderer

**File**: `src/components/chat/message-attachment.tsx`

```typescript
interface MessageAttachmentProps {
  part: {
    type: 'file';
    filename: string;
    mediaType: string;
    url: string;
  };
  variant?: 'compact' | 'full';  // For different display contexts
}
```

---

### Phase 7: Shared Chat Viewer

#### 7.1 Update SharedChatViewer

**File**: `src/components/shared-chat-viewer.tsx`

Add file part rendering to match the main chat interface. Attachments in shared chats should display the same as in the original chat.

---

### Phase 8: Message Persistence

#### 8.1 Update Chat API Message Storage

**File**: `src/app/api/chat/route.ts`

When persisting user messages, ensure file parts are included:

```typescript
// The lastUserMessage already contains parts with files
await db.insert(chatMessage).values({
  id: lastUserMessage.id || uuidv4(),
  chatId: chatRecord.id,
  role: "user",
  parts: JSON.stringify(lastUserMessage.parts),  // Includes file parts
  createdAt: new Date(),
}).onConflictDoNothing();
```

File parts are automatically serialized as:
```json
{
  "type": "file",
  "filename": "photo.jpg",
  "mediaType": "image/jpeg",
  "url": "https://cdn.example.com/user-uploads/..."
}
```

---

## File Types Summary

### Supported File Types

| Type | Extensions | Max Size | Notes |
|------|------------|----------|-------|
| Images | jpg, jpeg, png, gif, webp | 10MB (pre-resize) | Resized to max 2048px |
| PDF | pdf | 10MB | Sent as file attachment |
| Text | txt | 1MB | Content may be extracted |
| Markdown | md | 1MB | Content may be extracted |

### MIME Types

```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
];
```

---

## Model Considerations

### Model Capabilities Matrix

| Model | Images | PDFs | Text Files |
|-------|--------|------|------------|
| `openai/gpt-4.1-mini` | ✅ | ✅ | ✅ |
| `google/gemini-2.5-flash` | ✅ | ✅ | ✅ |
| `google/gemini-3-flash-preview` | ✅ | ✅ | ✅ |
| `anthropic/claude-haiku-4.5` | ✅ | ❌ | ✅ |

### Handling Unsupported Attachments

When user attaches a PDF while using Claude Haiku:
- Show a soft warning toast: "PDFs are not supported with Claude Haiku. Consider switching models or extracting text."
- Still allow send (model will ignore or error gracefully)

For text files (.txt, .md):
- All models support text content
- AI SDK extracts text content and includes in message

---

## New Files Summary

```
src/components/chat/
├── attachment-dialog.tsx       # File picker dialog with dropzone
├── attachment-preview-bar.tsx  # Thumbnail preview above input
└── message-attachment.tsx      # Render attachments in messages

src/lib/utils/
└── image-resize.ts             # Client-side image resizing
```

---

## Modified Files Summary

```
src/components/draft-chatbot.tsx        # Add attachment button, state, handlers
src/components/persistent-chatbot.tsx   # Add attachment button, state, handlers
src/components/shared-chat-viewer.tsx   # Render file parts in shared view
src/app/api/upload/route.ts             # Add image_operation creation
src/app/api/chat/route.ts               # Already handles file parts in messages
```

---

## Implementation Order

1. **Image resize utility** - Foundation for client-side processing
2. **AttachmentDialog** - File selection UI
3. **AttachmentPreviewBar** - Show pending attachments
4. **Update chatbot components** - Integrate attachment flow
5. **Upload API enhancement** - Add image_operation tracking
6. **MessageAttachment component** - Render in messages
7. **SharedChatViewer update** - Support in shared chats
8. **Testing & polish** - Edge cases, error handling

---

## Decisions

1. **Max attachments per message**: 5 files
2. **PDF handling**: Send natively to models that support it. Show warning for Claude Haiku (no PDF support)
3. **Drag-drop onto chat**: Yes - allow dropping files directly onto the chat area
4. **Storage**: Store full CDN URLs in message parts (small JSON, images load separately)
