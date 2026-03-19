import PlaylistEditClient from './PlaylistEditClient';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function PlaylistEditPage({ params }: { params: { id: string } }) {
  return <PlaylistEditClient params={params} />;
}
