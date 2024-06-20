import { createFederation, MemoryKvStore, Follow, Person } from "@fedify/fedify";
import { configure, getConsoleSink } from "@logtape/logtape";

await configure({
    sinks: { console: getConsoleSink() },
    filters: {},
    loggers: [
        { category: "fedify", sinks: ["console"], level: "info" },
    ],
});

const federation = createFederation<void>({
    kv: new MemoryKvStore(),
});

federation.setActorDispatcher("/users/{handle}", async (ctx, handle) => {
    if (handle !== "me") return null;  // Other than "me" is not found.
    return new Person({
        id: ctx.getActorUri(handle),
        name: "Me",  // Display name
        summary: "This is me!",  // Bio
        preferredUsername: handle,  // Bare handle
        url: new URL("/", ctx.url),
        inbox: ctx.getInboxUri(handle),  // Inbox URI
    });
});

federation
    .setInboxListeners("/users/{handle}/inbox", "/inbox")
    .on(Follow, async (ctx, follow) => {
        if (follow.id == null || follow.actorId == null || follow.objectId == null) {
            return;
        }
        const parsed = ctx.parseUri(follow.objectId);
        if (parsed?.type !== "actor" || parsed.handle !== "me") return;
        const follower = await follow.getActor(ctx);
        console.debug(follower);
    });

Deno.serve(
    request => federation.fetch(request, { contextData: undefined })
);