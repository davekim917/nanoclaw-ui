import { useParams } from 'react-router';

export default function SessionDetailPage() {
  const { group, key } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Session Detail</h1>
      <p className="text-muted-foreground mt-1">Group: {group} · Key: {key}</p>
    </div>
  );
}
