import ScreenDetailClient from './ScreenDetailClient';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ScreenDetailPage({ params }: { params: { id: string } }) {
  return <ScreenDetailClient params={params} />;
}
