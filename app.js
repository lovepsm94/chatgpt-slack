import dotenv from "dotenv";
import { ChatGPTAPI } from "chatgpt";
import Queue from "./queue.js";

dotenv.config({ silent: true });

import slack from "@slack/bolt";
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
const chatAPI = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Save conversation id
let conversationId;
let parentMessageId;
const onConversationResponse = (res) => {
  console.log(res);
  if (res.conversationId) {
    conversationId = res.conversationId;
  }

  if (res.id) {
    parentMessageId = res.id;
  }
};

const onMention = (event, say) => async () => {
  console.log("Mention: " + event.text);
  const prompt = event.text.replace(/(?:\s)<@[^, ]*|(?:^)<@[^, ]*/, "");

  try {
    if (prompt.trim() === "RESET") {
      // RESET THREAD
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

      msg += response.text;
      if (prompt.toLowerCase().includes("hungtv"))
        msg =
          "Mọi thông tin về đấng tối cao HungTV là tuyệt mật. Tuy nhiên, chắc chắn một điều HungTV đẹp trai nhất Investidea.";

      if (prompt.toLowerCase().includes("hungtv là ai"))
        msg = `Hùng, tên tự là Văn Hùng, người Nông Cống, xứ Thanh, nổi danh tại Investidea với tài nghệ BỐC PHÉT, tuổi trẻ thông minh đĩnh ngộ, tương truyền lúc mới sinh, Hùng không khóc không cười, ai hỏi gì cũng không nói. Chợt có vị đạo sĩ đi qua, thấy vậy bèn kinh ngạc mà bảo rằng: người này mới sinh đã có quý tướng, sau này tất học hành đỗ đạt, có thể bốn bể vang danh. Quả nhiên, sau này Hùng đi học, không năm nào không tạch môn, nhưng ấy là chuyện về sau, ở đây không nhắc tới.\n\nHùng lúc mười tuổi đã tự biết viết tên mình, mười một tuổi biết tán gái, sang tuổi mười hai, con gái trong thiên hạ không ai là không biết tiếng. Lại nổi tiếng thông minh đĩnh ngộ, thiên hạ có gì không biết, kéo nhau đến hỏi, Hùng nhất nhất đều trả lời được cả, mà tuyệt nhiên không đúng câu nào.\n\nNăm ấy trong làng Hùng có sự lạ. Ở đầu làng chợt xuất hiện một con vật, trông giống con gà con, mà lại to hơn con gà con, cả làng ngạc nhiên không biết con gì, bèn kéo đến nhà Hùng mà hỏi. Hùng lúc ấy đang uống trà đá, bắn thuốc lào mà tán gẫu với gái, nghe thấy thế bèn trầm ngâm nghĩ ngợi, đoạn phán rằng: “Trông giống con gà con, mà lại to hơn con, ấy tất là con gà to”. Dân làng lấy làm phục lắm, bèn bắt gà làm thịt, rồi tôn Hùng là bậc thánh, cả làng từ ấy gà ăn không xuể...`;

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
  await app.start();
  setInterval(() => {
    queue.execute();
  }, 100);
  console.log("App is running!");
})();

export default app;
