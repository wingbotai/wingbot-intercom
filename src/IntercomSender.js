/*
 * @author David Menger
 */
'use strict';

const request = require('request-promise-native');
const { ReturnSender } = require('wingbot');

class IntercomSender extends ReturnSender {

    /**
     *
     * @param {object} options
     * @param {string} options.botAdminId - id of the bot user in Intercom
     * @param {string} options.intercomAppToken - OAUTH token to authorize Intercom requests
     * @param {string} options.uri - override intercom URL
     * @param {string} userId
     * @param {object} incommingMessage
     * @param {object} incommingMessage.data
     * @param {object} incommingMessage.data.item
     * @param {string} incommingMessage.data.item.id
     * @param {console} [logger] - console like logger
     * @param {Function} [req] - request library replacement
     */
    constructor (options, userId, incommingMessage, logger = null, req = request) {
        super(options, userId, incommingMessage, logger);

        this._options = options;

        this.waits = true;

        this._req = req;
    }

    _transformPayload (payload) {
        const { botAdminId } = this._options;

        if (payload.target_app_id) {

            return {
                type: 'admin',
                admin_id: botAdminId,
                message_type: 'assignment',
                assignee_id: `${payload.target_app_id}`
            };
        }

        if (payload.message) {
            if (payload.message.attachment) {
                const { type, payload: p } = payload.message.attachment;

                switch (type) {
                    case 'image':
                    case 'video':
                    case 'file': {
                        return {
                            type: 'admin',
                            admin_id: botAdminId,
                            message_type: 'comment',
                            attachment_urls: [p.url]
                        };
                    }
                    case 'template':
                    default:
                }

            }

            if (payload.message.text) {
                return {
                    body: payload.message.text,
                    type: 'admin',
                    admin_id: botAdminId,
                    message_type: 'comment'
                };
            }
        }

        return null;
    }

    async _send (payload) {
        const body = this._transformPayload(payload);

        if (!body) {
            return null;
        }

        const { intercomAppToken, uri } = this._options;

        const {
            id
        } = this._incommingMessage.data.item;

        const data = {
            uri: `${uri.replace(/\/$/, '')}/conversations/${id}/reply`,
            headers: {
                Authorization: `Bearer ${intercomAppToken}`
            },
            method: 'POST',
            body,
            json: true
        };

        const res = await this._req(data);

        return res;
    }

}

module.exports = IntercomSender;
