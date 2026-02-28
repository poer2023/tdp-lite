import {
  listSnapshotGalleryRouteParams,
  listSnapshotMomentRouteParams,
  listSnapshotPostRouteParams,
} from "@/lib/search/searchSnapshot";

export async function getPostDetailStaticParams() {
  return listSnapshotPostRouteParams();
}

export async function getMomentDetailStaticParams() {
  return listSnapshotMomentRouteParams();
}

export async function getGalleryDetailStaticParams() {
  return listSnapshotGalleryRouteParams();
}

export async function getDefaultPostDetailStaticParams() {
  const params = await listSnapshotPostRouteParams();
  return params
    .filter((entry) => entry.locale === "zh")
    .map(({ slug }) => ({ slug }));
}

export async function getDefaultMomentDetailStaticParams() {
  const params = await listSnapshotMomentRouteParams();
  return params
    .filter((entry) => entry.locale === "zh")
    .map(({ id }) => ({ id }));
}

export async function getDefaultGalleryDetailStaticParams() {
  const params = await listSnapshotGalleryRouteParams();
  return params
    .filter((entry) => entry.locale === "zh")
    .map(({ imageId }) => ({ imageId }));
}
