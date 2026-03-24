import { useParams } from 'react-router';

export default function ChatPage() {
  const { group, threadId } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Chat</h1>
      <p className="text-muted-foreground mt-1">
        Group: {group}
        {threadId && <> · Thread: {threadId}</>}
      </p>
    </div>
  );
}
