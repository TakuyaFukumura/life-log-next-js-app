export type Timezone = 'Asia/Tokyo';

export type Tag = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
};

export type LifeLogLocation = {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    capturedAt: string;
};

export type LifeLog = {
    id: string;
    body: string;
    occurredAt: string;
    timezone: Timezone;
    tags: Tag[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    location: LifeLogLocation | null;
};

export type LifeLogLocationInput = {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    capturedAt: string;
} | null;

export type CreateLifeLogInput = {
    body: string;
    occurredAt?: string;
    tagIds?: string[];
    newTagNames?: string[];
    location?: LifeLogLocationInput;
};

export type UpdateLifeLogInput = Partial<CreateLifeLogInput>;

export type ApiLifeLog = Omit<LifeLog, 'deletedAt'>;

export const PAGE_SIZE = 20;
