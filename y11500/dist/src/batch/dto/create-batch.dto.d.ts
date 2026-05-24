export declare class CreateRepairOrderDto {
    orderNo: string;
    customerName?: string;
    phone?: string;
    productModel?: string;
    faultDescription?: string;
    repairDate?: Date;
    engineerName?: string;
    rawContent?: string;
}
export declare class CreateSparePartScanDto {
    scanNo: string;
    partCode: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    partType?: string;
    scanTime?: Date;
    operator?: string;
    rawContent?: string;
}
export declare class CreateCustomerSignPhotoDto {
    photoNo: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    customerName?: string;
    signTime?: Date;
    remark?: string;
    rawContent?: string;
}
export declare class CreateScanDetailDto {
    detailNo: string;
    barcode: string;
    partCode?: string;
    partName?: string;
    quantity?: number;
    unitPrice?: number;
    totalAmount?: number;
    partType?: string;
    scanTime?: Date;
    source?: string;
    rawContent?: string;
}
export declare class CreateBatchDto {
    batchNo?: string;
    description?: string;
    repairOrders?: CreateRepairOrderDto[];
    sparePartScans?: CreateSparePartScanDto[];
    customerSignPhotos?: CreateCustomerSignPhotoDto[];
    scanDetails?: CreateScanDetailDto[];
}
