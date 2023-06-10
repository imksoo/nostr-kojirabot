import * as Nostr from "nostr-tools";
import { RelayPool } from "nostr-relaypool";
import dotenv from "dotenv";

dotenv.config();

const MyPubkey = process.env.BOT_PUBKEY;
const MySecret = process.env.BOT_SECRET;

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
      since: Math.floor(new Date().getTime() / 1000 - 30 * 60),
    },
  ],
  feedRelays,
  (event, _isAfterEose, _relayURL) => {
    if (filterEvent(event)) {
      replyEvent(event);
    }
  }
);

function filterEvent(event: Nostr.Event): boolean {
  if (event.pubkey === MyPubkey) {
    return false;
  }

  if (event.content.match(/こじら[さん|氏|にゃん]/)) {
    return false;
  } else if (event.content.match(/こじら[さ-それず]/)) {
    return true;
  }
  return false;
}

function replyEvent(event: Nostr.Event): void {
  console.log(JSON.stringify({ event }));
  const parsedReplyTags = Nostr.nip10.parse(event);
  console.log(JSON.stringify({ parsedReplyTags }));

  const tags: string[][] = [];
  if (parsedReplyTags.root) {
    tags.push(["e", parsedReplyTags.root.id, "", "root"]);
    for (let i = 0; i < parsedReplyTags.mentions.length; ++i) {
      const m = parsedReplyTags.mentions[i];
      tags.push(["e", m.id, ""]);
    }
    tags.push(["e", event.id, "", "reply"]);
  } else {
    tags.push(["e", event.id, "", "root"]);
    for (let i = 0; i < parsedReplyTags.mentions.length; ++i) {
      const m = parsedReplyTags.mentions[i];
      tags.push(["e", m.id, ""]);
    }
  }

  for (let i = 0; i < parsedReplyTags.profiles.length; ++i) {
    const p = parsedReplyTags.profiles[i];
    tags.push(["p", p.pubkey]);
  }
  tags.push(["p", event.pubkey]);

  console.log(JSON.stringify({ tags }));

  const replyEvent = {
    sig: "",
    id: "",
    kind: 1,
    tags,
    pubkey: MyPubkey ?? "",
    content: "呼んだ？",
    created_at: event.created_at + 1,
  };

  replyEvent.id = Nostr.getEventHash(replyEvent);
  replyEvent.sig = Nostr.getSignature(replyEvent, MySecret ?? "");

  const validateEvent = Nostr.validateEvent(replyEvent);
  const verifySignature = Nostr.verifySignature(replyEvent);
  console.log(JSON.stringify({ validateEvent, verifySignature, replyEvent }));

  pool.publish(replyEvent, feedRelays);
}
