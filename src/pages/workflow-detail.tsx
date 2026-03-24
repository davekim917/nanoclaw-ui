import { useParams } from 'react-router';

export default function WorkflowDetailPage() {
  const { group, id } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Workflow Detail</h1>
      <p className="text-muted-foreground mt-1">Group: {group} · ID: {id}</p>
    </div>
  );
}
