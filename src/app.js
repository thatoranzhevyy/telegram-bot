const {telegram} = require("./telegram");
const {database} = require("./database");

telegram.start((ctx) => {
  ctx.replyWithMarkdown('ну ку. надо авторизоваться, используй команду:\n`/me` логинтелеграмма');
});

telegram.on('group_chat_created', (ctx) => {
  const group_id = ctx.update.message.chat.id
  telegram.telegram.createChatInviteLink(group_id, {
    name: "Прегласительная ссылка от бота",
    creates_join_request: false
  }).then(link => {
    database.run(`INSERT INTO groups (tg_id, tg_link) VALUES (?)`, [group_id, link]);
  })
});
telegram.on('new_chat_members', (ctx) => {
  const user_id = ctx.message.new_chat_members[0].id;
  const username = ctx.message.new_chat_members[0].username;

  if (user_id == process.env.TELEGRAM_BOT_ID) {
    const group_id = ctx.update.message.chat.id
    database.run(`INSERT INTO groups (tg_id) VALUES (?)`, [group_id]);
  } else {
    database.get("SELECT * FROM users WHERE tg_id=$tg_id", {$tg_id: user_id}, (error, row) => {
      if (!row || !row.access_group) {
        ctx.reply("@" + username + " короче, не выходите из группы. вам нелбходимо пойти авторизацию через бота " + "@rudest_bot что бы вы могли пройти в группу. запустите бота и отправте команду /me с логином в телеграм.")
        ctx.kickChatMember(user_id);
      }
    })
  }
});

telegram.command('me', async (ctx) => {
  const username = ctx.update.message.from.username;
  const userid = ctx.update.message.from.id;
  const parts = ctx.update.message.text.toLowerCase().split(' ');
  if (ctx.update.message.chat.type !== 'private') return (ctx.replyWithMarkdown('э, ты чо? я работаю только в лс😡'));
  if (!parts[1]) return (ctx.replyWithMarkdown('ваш логин не найден. обратитесь к админу.'));
  database.get("SELECT * FROM users WHERE ad_login=$ad_login", {$ad_login: parts[1]}, (error, row) => {
    if (!row) return (ctx.replyWithMarkdown('ваш логин не найден. обратитесь к админу.'));
    if (row.fired) return (ctx.replyWithMarkdown('чеееееел, ты куда? ну уволен же? имей совест!'));
    database.run("UPDATE users SET tg_username=?, tg_id=?, access_group=true WHERE ad_login=?", [username, userid, parts[1]], function (err, rows) {
      ctx.replyWithMarkdown('так, твой логин найден. и теперь ты можешь зайти в группу😎🤙');
    });
  });
});
telegram.command('add', async (ctx) => {
  const ad_login = ctx.update.message.text.toLowerCase().split(' ')[1];
  if (ad_login) {
    database.run(`INSERT INTO users (ad_login) VALUES(?)`, [ad_login], function (error) {
      ctx.replyWithMarkdown('новый пользователь добавлен!');
    });
  }
})
telegram.command('kick', async (ctx) => {
  const ad_login = ctx.update.message.text.toLowerCase().split(' ')[1];
  if (ad_login) {
    database.get("SELECT * FROM users WHERE ad_login=$ad_login", {$ad_login: ad_login}, (error, user_row) => {
      if (user_row && user_row.tg_id) {
        const telegram_user_id = user_row.tg_id;
        database.all("SELECT * FROM groups", (error, group_rows) => {
          group_rows.forEach((group_row) => {
            telegram.telegram.kickChatMember(group_row.tg_id, telegram_user_id).catch(err => {
            });
          })
        })
      }
    })
  }
})

telegram.launch();
