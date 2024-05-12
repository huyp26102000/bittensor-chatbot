const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const roundDown = (v, n = 4) => {
  return Math.floor(v * Math.pow(10, n)) / Math.pow(10, n);
};

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});
let actions = [];
const addressShortener = (addr = "", digits = 5) => {
  digits = 2 * digits >= addr.length ? addr.length : digits;
  return `${addr.substring(0, digits)}...${addr.slice(-digits)}`;
};
const fetchColdkeyStatus = async (address, chatId) => {
  try {
    const resp = await axios({
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.subquery.network/sq/TaoStats/bittensor-subnets",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
      },
      data: JSON.stringify({
        query:
          "query($filter: NeuronInfoFilter) {\n\t\t\tneuronInfos(filter: $filter) {\n\t\t\t\tnodes {\n\t\t\t\t\thotkey\n\t\t\t\t\tstake\n\t\t\t\t\tdailyReward\n\t\t\t\t}\n\t\t\t\tpageInfo {\n\t\t\t\t\thasNextPage\n\t\t\t\t\tendCursor\n\t\t\t\t}\n\t\t\t}\n\t\t}",
        variables: {
          filter: {
            coldkey: {
              equalTo: address,
            },
          },
        },
      }),
    });
    const listhotkey = resp.data.data.neuronInfos.nodes;
    const { totalRewardDaily, totalStake } = listhotkey.reduce(
      (acc, e) => {
        return {
          totalRewardDaily: acc.totalRewardDaily + +e?.dailyReward,
          totalStake: acc.totalStake + +e?.stake,
        };
      },
      { totalRewardDaily: 0, totalStake: 0 }
    );

    bot.sendMessage(
      chatId,
      `${listhotkey
        ?.map(
          (e) =>
            `<b>${addressShortener(e?.hotkey)}</b>
Daily Reward: <b>${roundDown(e?.dailyReward / 10 ** 9)}</b>
Stake: <b>${roundDown(e?.stake / 10 ** 9)}</b>\n`
        )
        .join("")}
Total Daily: <b>${roundDown(totalRewardDaily / 10 ** 9)}</b>
Total Stake: <b>${roundDown(totalStake / 10 ** 9)}</b>`, //<b>${}</b>
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.log(error);
    bot.sendMessage(chatId, `Unknow error`);
  }
};

const addAction = async (msg) => {
  try {
    const fromID = msg?.from?.id;
    actions = [
      ...actions.filter((e) => e?.from != fromID),
      {
        from: fromID,
        action: msg?.text,
      },
    ];
    await bot.sendMessage(msg.chat.id, `which address? (coldkey)`);
  } catch (error) {
    console.log("error add action");
  }
};
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  console.log(msg);
  const getStatus = async () => {
    const resp = await axios.get(`${CORE_URL}/status`);
    const data = resp?.data;
    console.log(data);
    await bot.sendMessage(
      chatId,
      `${data
        .map(
          (e, index) => `<b>${addressShortener(e?.address)}</b> <b>[${
            e?.start
              ? "Mining"
              : e?.["start-automine"]
              ? "Automine"
              : "Not running"
          }]</b>
  Claim: <b>${e?.claim}</b>
  \n`
        )
        .join("")}`,
      {
        parse_mode: "HTML",
      }
    );
  };
  const params = msg?.text.split(" ");
  const supportedMethod = ["claim", "automine"];
  const supportedParams = ["gas", "thresshold"];
  switch (params[0]) {
    case "/help":
      bot.sendMessage(chatId, `<code>/stake</code>`, {
        parse_mode: "HTML",
      });
      break;
    case "/status":
      addAction(msg);
      break;
    default:
      const selectedNode = msg?.text?.replace("/", "");
      const findAction = actions.find((e) => e?.from == msg?.from?.id);
      console.log(findAction);
      if (selectedNode && findAction) {
        switch (findAction?.action) {
          case "/status":
            fetchColdkeyStatus(selectedNode, chatId);
            break;
        }
      }
      break;
  }
});
