
require('dotenv').config()

const fs = require('fs')
const http = require('http')

const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')

const PAGE_SIZE = 6

const compatHanja = fs.readFileSync('assets/compatHanja.txt').toString()
        .split('\n')
        .filter(line => !line.startsWith('#') && line.length > 0)
        .map(line => line.split('\t'))
        .reduce((a, c) => (a[c[0]] = c[1], a), {})

const hanja = fs.readFileSync('assets/hanja.txt').toString()
        .split('\n')
        .filter(line => !line.startsWith('#') && line.length > 0)
        .map(line => line.split(':'))
        .filter(entry => entry[0].length == 1)
        .map(entry => {
            const hanja = compatHanja[entry[1]] ? compatHanja[entry[1]] : entry[1]
            if(entry[2].length == 0) return [hanja, entry[0]]
            else return [hanja, '[' + entry[0] + '] ' + entry[2]]
        })
        .reduce((a, c) => (a[c[0]] = (a[c[0]] ? a[c[0]] + ', ' + c[1] : c[1]), a), {})

const kancheja = fs.readFileSync('assets/kancheja.txt').toString()
        .split('\n').map(line => line.split('\t'))

const shinjache = fs.readFileSync('assets/shinjache.txt').toString()
        .split('\n').map(line => line.split('\t'))

const register = (entry) => {
    if(hanja[entry[1]] && hanja[entry[0]] && hanja[entry[1]] != hanja[entry[0]]) hanja[entry[1]] += ', ' + hanja[entry[0]]
    else hanja[entry[1]] = hanja[entry[0]]
}

kancheja.forEach(entry => register(entry))
shinjache.forEach(entry => register(entry))

const createButtons = (text, page) => {
    const filtered = text.split('').filter(c => hanja[c])
    const buttons = filtered
            .slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)
            .map(c => Markup.callbackButton(c, 'han_' + c))
    if(page > 0) buttons.unshift(Markup.callbackButton('<', 'page_' + (page-1)))
    if(page <= filtered.length / PAGE_SIZE - 1) buttons.push(Markup.callbackButton('>', 'page_' + (page+1)))
    return buttons
}

const bot = new Telegraf(process.env.BOT_TOKEN)

const onHanjaCommand = (ctx) => {
    if(!ctx.message.reply_to_message.text) return
    const buttons = createButtons(ctx.message.reply_to_message.text, 0)
    ctx.reply(ctx.message.reply_to_message.text, Markup.inlineKeyboard(buttons).extra())
}
bot.command('hanja', onHanjaCommand)
bot.command('무슨한자', onHanjaCommand)

bot.action(/han_(.+)/, ctx => {
    return ctx.answerCbQuery(hanja[ctx.match[1]])
})

bot.action(/page_(.+)/, ctx => {
    const page = parseInt(ctx.match[1])
    const text = ctx.update.callback_query.message.text
    ctx.editMessageText(text, Markup.inlineKeyboard(createButtons(text, page)).extra())
})

bot.catch(err => console.log(err))

bot.launch()

http.createServer().listen(process.env.PORT | 3000)
