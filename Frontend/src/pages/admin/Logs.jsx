import { SectionStub } from "../../components/admin/section-stub";
import { ScrollText } from "lucide-react";

export default function AdminLogs() {
  return <SectionStub icon={ScrollText} title="System Logs" description="Monitor system activity, errors, and audit trails" />;
}
