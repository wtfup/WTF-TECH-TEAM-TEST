import { useNavigate } from "react-router-dom";
import UploadExcel from "../components/UploadExcel";
import { PageHeader } from "../components/ui";

export default function UploadPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Upload Candidates"
        subtitle="Import an Excel workbook. Parsing runs in the background — progress and a
          read / inserted / merged / failed summary appear below."
      />
      <UploadExcel onSuccess={() => navigate("/candidates")} />
    </div>
  );
}
