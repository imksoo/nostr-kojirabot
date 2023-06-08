import * as Nostr from "nostr-tools";
import { RelayPool } from "nostr-relaypool";
import dotenv from "dotenv";

dotenv.config();

const pool = new RelayPool(undefined, {
  autoReconnect: true,
  logErrorsAndNotices: true,
});

const feedRelays = [
  "wss://relay-jp.nostr.wirednet.jp/",
  "wss://nostr-relay.nokotaro.com/",
  "wss://nostr.h3z.jp/",
  "wss://nostr.holybea.com/",
  "wss://yabu.me/",
];

pool.subscribe(
  [
    {
      kinds: [1],
      since: Math.floor(new Date().getTime() / 1000 - 10 * 60),
    },
  ],
  feedRelays,
  async (event, _isAfterEose, _relayURL) => {
    if (filterEvent(event)) {
      replyEvent(event);
    }
  }
);

function filterEvent(event: Nostr.Event): boolean {
  return event.content.includes("こじら");
}

function replyEvent(event: Nostr.Event): void {
  const reply = {
    sig: "",
    id: "",
    kind: 1,
    tags: [
      ["e", event.id, "", "reply"],
      ["p", event.pubkey],
    ],
    pubkey: process.env.BOT_PUBKEY ?? "",
    content: "呼んだ？",
    created_at: event.created_at + 1,
  };

  reply.id = Nostr.getEventHash(reply);
  reply.sig = Nostr.getSignature(reply, process.env.BOT_SECRET ?? "");

  const validateEvent = Nostr.validateEvent(reply);
  const verifySignature = Nostr.verifySignature(reply);
  console.log(JSON.stringify({ validateEvent, verifySignature, reply }));

  pool.publish(reply, feedRelays);
}
