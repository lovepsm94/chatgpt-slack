import dotenv from "dotenv";
import { ChatGPTAPIBrowser } from "chatgpt";
import Queue from "./queue.js";

dotenv.config({ silent: true });

import slack from "@slack/bolt";
import { EVALUATION_SCRIPT_URL } from "puppeteer";
const { App } = slack;
// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true, // add this
  appToken: process.env.SLACK_APP_TOKEN, // add this
});

// Initializes queue
const queue = new Queue();

const chatAPI = new ChatGPTAPIBrowser({
  email: process.env.OPENAI_EMAIL,
  password: process.env.OPENAI_PASSWORD,
  // isGoogleLogin: true,
});

// Save conversation id
let conversationId;
let parentMessageId;
const onConversationResponse = (res) => {
  if (res.conversationId) {
    conversationId = res.conversationId;
  }

  if (res.messageId) {
    parentMessageId = res.messageId;
  }
};

const onMention = (event, say) => async () => {
  console.log("Mention: " + event.text);
  const prompt = event.text.replace(/(?:\s)<@[^, ]*|(?:^)<@[^, ]*/, "");

  try {
    if (prompt.trim() === "RESET") {
      // RESET THREAD
      chatAPI.resetThread();

      conversationId = "";
      parentMessageId = "";

      let msg = "<@" + event.user + "> Đã reset chủ đề cuộc hội thoại";

      await say({ text: msg, thread_ts: event.thread_ts });
    } else {
      // reply
      let msg = "<@" + event.user + "> Đã hỏi:\n";
      msg += ">" + prompt + "\n";

      const response = await chatAPI.sendMessage(prompt, {
        conversationId,
        parentMessageId,
      });
      msg += response.response;
      onConversationResponse(response);
      await say({ text: msg, thread_ts: event.thread_ts });
    }
  } catch (error) {
    if (error?.statusCode === 429) {
      await say({
        text: "Hỏi nhiều quá bot chết rồi, thử lại sau một giờ nữa",
        thread_ts: event.thread_ts,
      });
    }
  }
};

// Listens to mention
app.event("app_mention", async ({ event, context, client, say }) => {
  if (queue.size() < 100) {
    queue.push(onMention(event, say));
  } else {
    const msg = "<@" + event.user + "> Bot đang quá tải, đợi tí hãy hỏi lại";
    await say({ text: msg, thread_ts: event.thread_ts });
  }
});

(async () => {
  await chatAPI.initSession();
  await app.start();
  setInterval(() => {
    queue.execute();
  }, 100);
  console.log("App is running!");
})();
