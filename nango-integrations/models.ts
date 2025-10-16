import * as z from 'zod';

export const SlackUser = z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    deleted: z.boolean(),
    tz: z.string(),
    tz_label: z.string(),
    tz_offset: z.number(),

    profile: z.object({
        avatar_hash: z.string(),
        real_name: z.union([z.string(), z.null()]),
        display_name: z.union([z.string(), z.null()]),
        real_name_normalized: z.union([z.string(), z.null()]),
        display_name_normalized: z.union([z.string(), z.null()]),
        email: z.union([z.string(), z.null()]),
        image_original: z.union([z.string(), z.null()])
    }),

    is_admin: z.boolean(),
    is_owner: z.boolean(),
    is_primary_owner: z.boolean(),
    is_restricted: z.boolean(),
    is_ultra_restricted: z.boolean(),
    is_bot: z.boolean(),
    updated: z.number(),
    is_app_user: z.boolean(),
    raw_json: z.string()
});

export type SlackUser = z.infer<typeof SlackUser>;

export const SendMessageInput = z.object({
    channel: z.string(),
    text: z.string()
});

export type SendMessageInput = z.infer<typeof SendMessageInput>;

export const SendMessageOutput = z.object({
    ok: z.boolean(),
    channel: z.string().optional(),
    ts: z.string().optional(),
    message: z.string().optional(),
    warning: z.string().optional(),
    error: z.string().optional(),
    raw_json: z.string()
});

export type SendMessageOutput = z.infer<typeof SendMessageOutput>;

export const IdEntity = z.object({
    id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const DocumentMetadata = z.object({
    files: z.string().array(),
    folders: z.string().array()
});

export type DocumentMetadata = z.infer<typeof DocumentMetadata>;

export const Document = z.object({
    id: z.string(),
    url: z.string(),
    title: z.string(),
    mimeType: z.string(),
    updatedAt: z.string()
});

export type Document = z.infer<typeof Document>;

export const JSONDocument = z.object({
    documentId: z.string(),
    title: z.string(),
    url: z.string(),
    tabs: z.object({}).array(),
    revisionId: z.string(),

    suggestionsViewMode: z.union([
        z.literal('DEFAULT_FOR_CURRENT_ACCESS'),
        z.literal('SUGGESTIONS_INLINE'),
        z.literal('PREVIEW_SUGGESTIONS_ACCEPTED'),
        z.literal('PREVIEW_WITHOUT_SUGGESTIONS')
    ]),

    body: z.object({}),
    headers: z.object({}),
    footers: z.object({}),
    footnotes: z.object({}),
    documentStyle: z.object({}),
    suggestedDocumentStyleChanges: z.object({}),
    namedStyles: z.object({}),
    suggestedNamedStylesChanges: z.object({}),
    lists: z.object({}),
    namedRanges: z.object({}),
    inlineObjects: z.object({}),
    positionedObjects: z.object({})
});

export type JSONDocument = z.infer<typeof JSONDocument>;
export const Anonymous_googledrive_action_fetchdocument_output = z.string();
export type Anonymous_googledrive_action_fetchdocument_output = z.infer<typeof Anonymous_googledrive_action_fetchdocument_output>;

export const models = {
    SlackUser: SlackUser,
    SendMessageInput: SendMessageInput,
    SendMessageOutput: SendMessageOutput,
    IdEntity: IdEntity,
    DocumentMetadata: DocumentMetadata,
    Document: Document,
    JSONDocument: JSONDocument,
    Anonymous_googledrive_action_fetchdocument_output: Anonymous_googledrive_action_fetchdocument_output
};
