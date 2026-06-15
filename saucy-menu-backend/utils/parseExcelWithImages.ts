import ExcelJS from 'exceljs';

interface RowWithImages {
    row: Record<string, any>;
    rowNumber: number;
    images: {
        buffer: Buffer;
        extension: string;
        name: string;
        type: string
    }[];
}

export async function parseExcelWithImages(buffer: ArrayBuffer): Promise<RowWithImages[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const result: RowWithImages[] = [];

    const sheet = workbook.worksheets[0]; // Assuming first sheet

    // Get headers
    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.slice(1); // remove index 0

    // Map row data
    sheet.eachRow((row, rowIndex) => {
        if (rowIndex === 1) return; // Skip header

        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
                rowData[header] = cell.value;
            }
        });

        result.push({
            row: rowData,
            rowNumber: row.number,
            images: []
        });
    });


    // Attach images by position
    const sheetImages = sheet.getImages();



    for (const imageInfo of sheetImages) {
        const image = workbook.model.media?.find((m) => m.index === imageInfo.imageId);
        const range = imageInfo.range?.tl?.nativeRow + 1; // ExcelJS uses 0-based index

        if (!image?.buffer || !range) continue;


        const rowEntry = result.find((r) => r.rowNumber === range);
        if (rowEntry) {
            rowEntry.images.push(image as any);
        }
    }

    return result;
}
