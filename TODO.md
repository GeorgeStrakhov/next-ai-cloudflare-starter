## BIG THINGS:


- add perplexity tool via https://www.npmjs.com/package/@perplexity-ai/ai-sdk
- add exa tool via https://www.npmjs.com/package/@exalabs/ai-sdk

- add image editing via our replicate image gen (nano banana pro)

- images: 1:1 should be square. rethink masonry
- images: add vectorize (svg)

- add knowledge bases and embeddings (?)


- add documents and image uploads to the chat input and rendering them and processing. make sure images (if from mobile upload or what not) are downscaled if they are huge (on the frontend) not to eat too many tokens.

- add analytics events to our chat and images

- admin interface to add banner to both landing and inside
- subscribers table and admin interface to email them

##  FIXES:

- fix masonry so that square images are square and 16:9 is default

- migrate away from tabler and to lucide react (?)
- make posthog optional (turn off by default)
- telegram notification service
- add admin feature to broadcast messages to all users

## LATER IMPROVEMENTS:

- dashboard home page with unified search across chats (titles + message content) and images (prompts, metadata)

- add logging and alerting (investigate best setup on cloudflare) OR sentry?
- add voice with real-time transcription? or just a normal whisper?
- add waitlist and invites
- add TTS and STT services
- social sign-in?
