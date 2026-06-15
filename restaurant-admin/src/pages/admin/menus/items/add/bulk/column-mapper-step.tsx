import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MenuItemField, ColumnMapping, ParsedRow } from '../bulk-upload';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ColumnMapperStepProps {
  csvColumns: string[];
  csvData: ParsedRow[];
  columnMappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onConfirm: () => void;
}

const MENU_ITEM_FIELDS: MenuItemField[] = [
  'name',
  'type',
  'description',
  'price',
  'section',
//   'discountType',
//   'discountValue',
//   'discountStartAt',
//   'discountEndAt',
//   'discountLabel',
//   'isAvailable',
  'spiceLevel',
  'cookTime',
  'variant_name',
  'variant_price',
//   'isAlcoholic',
//   'isChefsRecommended',
//   'isPopular',
//   'isNew',
//   'isLimitedTime',
  'ingredients',
  'images',
  'translations',
  'variants',
  'addons',
  'allergens',
];

const REQUIRED_FIELDS: MenuItemField[] = [];

export const ColumnMapperStep = ({
  csvColumns,
  csvData,
  columnMappings,
  onMappingsChange,
  onConfirm,
}: ColumnMapperStepProps) => {
  const { t } = useTranslation();
  const addMapping = () => {
    const unmappedColumns = csvColumns.filter(
      (col) => !columnMappings.some((m) => m.csvColumn === col)
    );
    if (unmappedColumns.length > 0) {
      const newMappings = [
        ...columnMappings,
        { csvColumn: unmappedColumns[0], menuItemField: 'name' },
      ];
      onMappingsChange(newMappings as ColumnMapping[]);
    }
  };

  const updateMapping = (index: number, field: MenuItemField) => {
    const newMappings = [...columnMappings];
    newMappings[index].menuItemField = field;
    onMappingsChange(newMappings);
  };

  const removeMapping = (index: number) => {
    const newMappings = columnMappings.filter((_, i) => i !== index);
    onMappingsChange(newMappings);
  };

  const unmappedColumns = csvColumns.filter(
    (col) => !columnMappings.some((m) => m.csvColumn === col)
  );

  const mappedFields = new Set(columnMappings.map((m) => m.menuItemField));
  const requiredFieldsMapped = REQUIRED_FIELDS.every((field) => mappedFields.has(field));

// map fields when file is uploaded
// useEffect(() => {
//   if (csvData.length > 0) {
//     csvData.forEach((row) => {
//       const mappedFields = columnMappings.map((mapping) => {
//         return {
//           csvColumn: row[mapping.csvColumn],
//           menuItemField: mapping.menuItemField,
//         };
//       });
//       onMappingsChange(mappedFields);
//     });
//   }
// }, [csvData, columnMappings, onMappingsChange]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">{t("admin.menus.items.add.bulk.mapper.csvColumnsFound")}: {csvColumns.length}</h3>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="space-y-1 text-xs">
              {csvColumns.map((col) => (
                <div key={col} className="text-muted-foreground">
                  • {col}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("admin.menus.items.add.bulk.mapper.sampleData")}</h3>
          <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
            <div className="space-y-1 text-xs">
              {csvData.length > 0 &&
                Object.entries(csvData[0]).map(([key, value]) => (
                  <div key={key} className="text-muted-foreground">
                    <span className="font-medium">{key}:</span> {String(value).substring(0, 50)}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">{t("admin.menus.items.add.bulk.mapper.columnMappings")}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addMapping}
            disabled={unmappedColumns.length === 0}
          >
            {t("admin.menus.items.add.bulk.mapper.addMapping")}
          </Button>
        </div>

        {columnMappings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("admin.menus.items.add.bulk.mapper.noMappings")}</p>
          </div>
        )}

        <div className="space-y-3">
          {columnMappings.map((mapping, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">{t("admin.menus.items.add.bulk.mapper.csvColumn")}</Label>
                    <div className="text-sm font-medium">{mapping.csvColumn}</div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground mb-1">{t("admin.menus.items.add.bulk.mapper.menuItemField")}</Label>
                    <div className="flex gap-2">
                      <Select value={mapping.menuItemField} onValueChange={(value) => updateMapping(index, value as MenuItemField)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MENU_ITEM_FIELDS.map((field) => (
                            <SelectItem key={field} value={field}>
                              { field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(index)}
                        className="h-10 w-10 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${requiredFieldsMapped ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'}`}>
        <p className={`text-sm font-semibold ${requiredFieldsMapped ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'}`}>
          {requiredFieldsMapped ? t("admin.menus.items.add.bulk.mapper.allRequiredMapped") : t("admin.menus.items.add.bulk.mapper.missingRequired")}
        </p>
        <p className={`text-xs ${requiredFieldsMapped ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
          {t("admin.menus.items.add.bulk.mapper.required")}: {REQUIRED_FIELDS.join(', ')}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={onConfirm}
          disabled={!requiredFieldsMapped}
        >
          {t("admin.menus.items.add.bulk.mapper.continueToPreview")}
        </Button>
      </div>
    </div>
  );
};
