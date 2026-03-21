import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Calculator,
  CheckSquare,
  ClipboardPaste,
  Copy,
  FileDown,
  FileUp,
  FileCode,
  LayoutGrid,
  Redo2,
  Undo2,
  Save,
  Trash2,
} from "lucide-react";

interface TopToolbarProps {
  onSave: () => void;
  onValidate: () => void;
  onCalculate: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onExportPdf: () => void;
  onExportXml: () => void;
  onImportXml: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  oilFieldName?: string;
}

export function TopToolbar({
  onSave,
  onValidate,
  onCalculate,
  onDelete,
  onCopy,
  onPaste,
  onExportPdf,
  onExportXml,
  onImportXml,
  onUndo,
  onRedo,
  onAutoLayout,
  oilFieldName,
}: TopToolbarProps) {
  const { t } = useLanguage();
  return (
    <div className="top-toolbar">
      <div className="toolbar-title">{t("fieldSchemeTitle")}</div>
      <div className="toolbar-field">
        {oilFieldName ? `${t("fieldSchemeOilFieldPrefix")} ${oilFieldName}` : ""}
      </div>
      <div className="toolbar-actions menu-bar">
        <Button size="icon" variant="outline" onClick={onUndo} title={t("fieldSchemeUndo")}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onRedo} title={t("fieldSchemeRedo")}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <span className="toolbar-divider" />
        <Button size="icon" variant="outline" onClick={onValidate} title={t("fieldSchemeValidate")}>
          <CheckSquare className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onCalculate} title={t("fieldSchemeCalculate")}>
          <Calculator className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onSave} title={t("fieldSchemeSave")}>
          <Save className="h-4 w-4" />
        </Button>
        <span className="toolbar-divider" />
        <Button size="icon" variant="outline" onClick={onCopy} title={t("fieldSchemeCopy")}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onPaste} title={t("fieldSchemePaste")}>
          <ClipboardPaste className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onDelete} title={t("fieldSchemeDelete")}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onAutoLayout} title={t("fieldSchemeAutoLayout")}>
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <span className="toolbar-divider" />
        <Button size="icon" variant="outline" onClick={onExportPdf} title={t("fieldSchemeExportPdf")}>
          <FileDown className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onExportXml} title={t("fieldSchemeExportXml")}>
          <FileCode className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onImportXml} title={t("fieldSchemeImportXml")}>
          <FileUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
