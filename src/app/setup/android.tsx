import { useState } from "react";
import { SetupChecklist } from "../../components/SetupChecklist";
import { androidChecklistItems } from "../../features/setup/checklistItems";
import { t } from "../../i18n";

export default function AndroidSetupChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  return (
    <SetupChecklist
      title={t("setupChecklist.android.title")}
      items={androidChecklistItems}
      completed={completed}
      onChangeCompleted={setCompleted}
    />
  );
}
