/*
* @author Juraj Hríb
*/
'use strict';

const sinon = require('sinon');
const assert = require('assert');
const IntercomSender = require('../src/IntercomSender');

const INPUT_MESSAGE = {
    data: {
        item: {
            id: '1'
        }
    }
};

function createLogger () {
    return {
        error: sinon.spy(),
        log: sinon.spy()
    };
}

describe('<BotServiceSender>', () => {

    let sender;
    let logger;
    let req;

    beforeEach(() => {
        logger = createLogger();
        req = sinon.spy(() => Promise.resolve({}));
        sender = new IntercomSender(
            { uri: 'http://x.cz', botAdminId: '1', intercomAppToken: 't' },
            'user-id',
            INPUT_MESSAGE,
            // @ts-ignore
            logger,
            req
        );
    });

    it('should create sender factory and handle message', function () {
        const promise = sender.finished();

        assert(promise instanceof Promise);

        return promise
            .then(() => {
                assert(logger.log.called, 'should be called before promise is resolved');
            });

    });

    it('translates handover to event', async () => {
        sender.send({ recipient: { id: '1' }, target_app_id: '2' });

        const promise = sender.finished();

        assert(promise instanceof Promise);

        await promise;

        assert.deepEqual(req.firstCall.args[0], {
            body: {
                admin_id: '1',
                assignee_id: '2',
                message_type: 'assignment',
                type: 'admin'
            },
            headers: {
                Authorization: 'Bearer t'
            },
            json: true,
            method: 'POST',
            uri: 'http://x.cz/conversations/1/reply'
        });

        assert(logger.log.called, 'should be called before promise is resolved');
    });

});
