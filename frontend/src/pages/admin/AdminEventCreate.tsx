import { PageHeader } from '../../components/ui/PageHeader';
import { EventForm } from '../../components/admin/EventForm';

export default function AdminEventCreate() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Create Event" subtitle="Add a new event to the GDGoC GCEE calendar." />
      <EventForm />
    </div>
  );
}
