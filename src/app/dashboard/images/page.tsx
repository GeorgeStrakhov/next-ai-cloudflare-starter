export const dynamic = "force-dynamic";

import { ImageGallery } from "@/components/images";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export default function ImagesPage() {
  return (
    <>
      <PageBreadcrumb title="Images" />
      <ImageGallery />
    </>
  );
}
