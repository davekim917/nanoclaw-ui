import { useParams } from 'react-router';

export default function SessionsPage() {
  const { group } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Sessions</h1>
      <p className="text-muted-foreground mt-1">Group: {group}</p>
    </div>
  );
}
