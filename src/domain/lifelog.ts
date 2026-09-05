export type Timezone = 'Asia/Tokyo';

export type Tag = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
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
};

export type CreateLifeLogInput = {
    body: string;
    occurredAt?: string;
    tagIds?: string[];
    newTagNames?: string[];
};

export type UpdateLifeLogInput = Partial<CreateLifeLogInput>;

export type ApiLifeLog = Omit<LifeLog, 'deletedAt'>;

export const PAGE_SIZE = 20;
