import { useParams } from 'react-router';
import WorkflowsPage from './workflows';

// Thin wrapper — workflow detail logic lives in WorkflowsPage which checks for the :id param.
export default function WorkflowDetailPage() {
  const { group, id } = useParams<{ group: string; id: string }>();

  if (!group || !id) return null;

  // Re-use the same component — it detects the id param and renders detail view.
  return <WorkflowsPage />;
}
