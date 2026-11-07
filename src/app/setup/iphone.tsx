import { useState } from "react";
import { SetupChecklist } from "../../components/SetupChecklist";
import { iphoneChecklistItems } from "../../features/setup/checklistItems";
import { t } from "../../i18n";

export default function IphoneSetupChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  return (
    <SetupChecklist
      title={t("setupChecklist.iphone.title")}
      items={iphoneChecklistItems}
      completed={completed}
      onChangeCompleted={setCompleted}
    />
  );
}
