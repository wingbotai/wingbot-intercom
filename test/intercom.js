'use strict';

const sinon = require('sinon');
const { assert } = require('chai');
const {
    Tester, Router
} = require('wingbot');
const Intercom = require('../src/Intercom');

function createInputMessage (body, conversationId = '1') {
    return {
        data: {
            item: {
                type: 'conversation',
                id: conversationId,
                conversation_message: {
                    body
                },
                conversation_parts: {
                    conversation_parts: []
                }
            }
        }
    };
}

function createSendMock () {
    return sinon.spy(async function sendFnMock (req) {
        return req.body;
    });
}

describe('<BotService>', function () {

    it('should treat member added message as conversation update', async () => {
        const bot = new Router();

        bot.use((r, res) => {
            res.text('Hello World!');
        });

        const t = new Tester(bot);

        const sendFnMock = createSendMock();

        const botService = new Intercom(t.processor, {
            botAdminId: 'mock-id',
            intercomAppToken: 'mock-secret',
            requestLib: sendFnMock
        });

        await botService.processEvent(createInputMessage('hello'));

        assert.deepEqual(sendFnMock.firstCall.args[0], {
            body: {
                admin_id: 'mock-id',
                body: 'Hello World!',
                message_type: 'comment',
                type: 'admin'
            },
            headers: {
                Authorization: 'Bearer mock-secret'
            },
            json: true,
            method: 'POST',
            uri: 'https://api.intercom.io/conversations/1/reply'
        });
    });

});
