import { useParams } from 'react-router';

export default function WorkflowsPage() {
  const { group } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Workflows</h1>
      <p className="text-muted-foreground mt-1">Group: {group}</p>
    </div>
  );
}
