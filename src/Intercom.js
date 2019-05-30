/*
 * @author David Menger
 */
'use strict';

const { Request } = require('wingbot');
const request = require('request-promise-native');
const IntercomSender = require('./IntercomSender');

/**
 * @typedef {Object} Processor
 * @param {Function} processMessage
 */

/**
 * BotService connector for wingbot.ai
 *
 * @class
 */
class Intercom {

    /**
     *
     * @param {Processor} processor - wingbot Processor instance
     * @param {object} options
     * @param {string} options.botAdminId - id of the bot user in Intercom
     * @param {string} options.intercomAppToken - OAUTH token to authorize Intercom requests
     * @param {string} [options.passThreadAction] - trigger this action for pass thread event
     * @param {Function} [options.requestLib] - request library replacement for testing
     * @param {string} [options.uri] - override intercom URL
     * @param {console} [senderLogger] - optional console like chat logger
     */
    constructor (processor, options, senderLogger = null) {
        this._options = {
            botAdminId: null,
            intercomAppToken: null,
            uri: 'https://api.intercom.io'
        };

        Object.assign(this._options, options);

        this.processor = processor;
        this._senderLogger = senderLogger;

        this._request = options.requestLib || request;
    }

    async processMessage (message, senderId, pageId) {

        // synthetize message without content
        const botsetviceEvent = {
            data: {
                item: {
                    type: 'conversation',
                    id: senderId
                }
            }
        };


        // simulate incomming event
        const messageSender = await this._createSender(botsetviceEvent);

        return this.processor.processMessage(message, pageId, messageSender);
    }

    /**
     *
     * @private
     * @param {object} body - event body
     */
    async _createSender (body) {
        const {
            botAdminId,
            intercomAppToken,
            uri
        } = this._options;

        const opts = {
            botAdminId,
            intercomAppToken,
            uri
        };

        const { id: senderId } = body.data.item;

        // @ts-ignore
        return new IntercomSender(opts, senderId, body, this._senderLogger, this._request);
    }

    /**
     * Process Facebook request
     *
     * @param {object} body - event body
     * @returns {Promise<Array<{message:object,pageId:string}>>} - unprocessed events
     */
    async processEvent (body) {
        if (!body.data || !body.data.item || body.data.item.type !== 'conversation') {
            return [];
        }

        const {
            id: senderId,
            conversation_message: msg,
            conversation_parts: cp,
            assignee,
            created_at: ts,
            user
        } = body.data.item;

        if (assignee && assignee.id !== this._options.botAdminId) {
            return [];
        }

        const { conversation_parts: parts = [] } = cp;

        let isHandover = false;
        let message;
        let timestamp;

        if (parts.length === 0) {
            message = msg.body.replace(/<(?:.|\n)*?>/gm, '');
            timestamp = ts * 1000;
        } else {
            const handover = parts.find(p => p.part_type === 'assignment');
            timestamp = parts.created_at * 1000;

            if (handover) {
                if (handover.assigned_to.id !== this._options.botAdminId
                    || handover.author.id === this._options.botAdminId
                    || !this._options.passThreadAction) {
                    // ignore it

                    return [];
                }

                isHandover = true;
            } else {
                message = parts
                    .map(p => p.body.replace(/<(?:.|\n)*?>/gm, ''))
                    .join(' ');
            }
        }

        let req;

        if (isHandover) {
            const action = this._options.passThreadAction;
            req = Request.postBack(senderId, action, {}, null, {}, timestamp);
        } else {
            req = Request.text(senderId, message, timestamp);
        }

        const messageSender = await this._createSender(body);

        return this.processor.processMessage(
            req,
            this._options.botAdminId,
            messageSender,
            { user }
        );
    }


    /**
     * Verify Facebook webhook event
     *
     * @param {string|Buffer} body - parsed request body
     * @param {object} headers - request headers
     * @returns {Promise}
     * @throws {Error} when authorization token is invalid or missing
     */
    async verifyRequest (body, headers) { // eslint-disable-line
        // there's no validation
    }

}

module.exports = Intercom;
