/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { PreviewStep } from './bulk/preview-step';
import { ColumnMapperStep } from './bulk/column-mapper-step';
import { CSVUploadStep } from './bulk/csv-upload-step';
import { useTranslation } from 'react-i18next';

export type MenuItemField = 
  | 'name' 
  | 'section'
  | 'type' 
  | 'description' 
  | 'price' 
//   | 'discountType' 
//   | 'discountValue' 
//   | 'discountStartAt' 
//   | 'discountEndAt' 
//   | 'discountLabel' 
//   | 'isAvailable' 
  | 'spiceLevel' 
  | 'cookTime' 
  | 'variant_name'
  | 'variant_price'
//   | 'isAlcoholic' 
//   | 'isChefsRecommended' 
//   | 'isPopular' 
//   | 'isNew' 
//   | 'isLimitedTime' 
  | 'ingredients' 
  | 'images' 
  | 'translations' 
  | 'variants' 
  | 'addons' 
  | 'allergens';

export interface ColumnMapping {
  csvColumn: string;
  menuItemField: MenuItemField;
}

export interface ParsedRow {
  [key: string]: any;
}

export const BulkUpload = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  const handleCSVUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ParsedRow[];
        const columns = results.meta.fields || [];
        
        setCsvData(data);
        setCsvColumns(columns);
        setStep('map');
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
      },
    });
  };

  const handleMappingsChange = (mappings: ColumnMapping[]) => {
    setColumnMappings(mappings);
  };

  const handleConfirmMappings = () => {
    setStep('preview');
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.menus.items.add.bulk.title")}</CardTitle>
          <CardDescription>
            {t("admin.menus.items.add.bulk.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={step} onValueChange={(value) => setStep(value as 'upload' | 'map' | 'preview')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={csvData.length === 0 && step !== 'upload'}>
                {t("admin.menus.items.add.bulk.tabs.upload")}
              </TabsTrigger>
              <TabsTrigger value="map" disabled={csvData.length === 0}>
                {t("admin.menus.items.add.bulk.tabs.map")}
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={columnMappings.length === 0}>
                {t("admin.menus.items.add.bulk.tabs.preview")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <CSVUploadStep onCSVUpload={handleCSVUpload} />
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <ColumnMapperStep
                csvColumns={csvColumns}
                csvData={csvData}
                columnMappings={columnMappings}
                onMappingsChange={handleMappingsChange}
                onConfirm={handleConfirmMappings}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              <PreviewStep
                csvData={csvData}
                columnMappings={columnMappings}
                csvColumns={csvColumns}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
