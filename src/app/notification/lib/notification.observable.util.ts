//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { Observable } from 'windowed-observable';
export const INTERNAL_NOTIFICATION_SEND: string = 'send_notification';
export const INTERNAL_NOTIFICATION_RECEIVE: string = 'receive_notification';
export const INTERNAL_SHOW_NOTIFICATION_MSG: string = 'show_notification_msg';

export const publishToShowNotificationMessage = (msg: string, title?: string, options?: any) => {
    new Observable(INTERNAL_SHOW_NOTIFICATION_MSG).publish({ msg, title, options });
}

export const subscribeToShowNotificationMessage = (uniqueRegistryKey: string, cb: (data: { msg: string, title?: string, options?: any }) => void) => {
    if (!cb || !uniqueRegistryKey) return;
    // @ts-ignore
    if (window[uniqueRegistryKey]) return;//ignore if already registered
    window[uniqueRegistryKey] = true;
    new Observable(INTERNAL_SHOW_NOTIFICATION_MSG).subscribe(cb);
}

export const publishSenderNotification = (data: NotificationSenderData) => {
    if (!data.clientContexts)
        data.clientContexts = [];

    data.clientContexts.push({ name: 'is_module_agnostic', value: data.isModuleAgnostic ? 'true' : 'false' });
    data.clientContexts.push({ name: 'is_person_agnostic', value: data.isPersonAgnostic ? 'true' : 'false' });
    data.clientContexts.push({ name: 'msgPropNameOrMsg', value: data.msgPropNameOrMsg ?? '' });

    new Observable(INTERNAL_NOTIFICATION_SEND).publish(data);
}

export const publishSenderNotificationByTopic = (topicName: string, data: NotificationSenderData) => {
    if (!topicName) return;

    if (!!data.clientContexts)
        data.clientContexts = [];

    data.clientContexts.push({ name: 'is_module_agnostic', value: data.isModuleAgnostic ? 'true' : 'false' });
    data.clientContexts.push({ name: 'is_person_agnostic', value: data.isPersonAgnostic ? 'true' : 'false' });
    data.clientContexts.push({ name: 'msgPropNameOrMsg', value: data.msgPropNameOrMsg ?? '' });

    new Observable(topicName).publish(data);
}


export const publishSenderNotificationWithParams = (notificationTypeName: string,
    clientContexts?: NotificationClientContext[],
    data?: string,
    audienceType?: AudienceType,
    audiences?: NotificationAudience[],
    isModuleAgnostic?: boolean,
    isPersonAgnostic?: boolean,
    msgPropNameOrMsg?: string) => {

    if (!clientContexts)
        clientContexts = [];

    clientContexts.push({ name: 'is_module_agnostic', value: isModuleAgnostic ? 'true' : 'false' });
    clientContexts.push({ name: 'is_person_agnostic', value: isPersonAgnostic ? 'true' : 'false' });
    clientContexts.push({ name: 'msgPropNameOrMsg', value: msgPropNameOrMsg ?? '' });

    const notificatonData = new NotificationSenderData();
    notificatonData.clientContexts = clientContexts;
    notificatonData.notificationTypeName = notificationTypeName;
    notificatonData.audienceType = audienceType;// ?? AudienceType.ALL_USERS;
    notificatonData.audiences = audiences;
    notificatonData.data = data;

    new Observable(INTERNAL_NOTIFICATION_SEND).publish(notificatonData);
};

export const publishSenderNotificationWithParamsByTopic = (topicName: string, notificationTypeName: string,
    clientContexts?: NotificationClientContext[],
    data?: string,
    audienceType?: AudienceType,
    audiences?: NotificationAudience[],
    isModuleAgnostic?: boolean,
    isPersonAgnostic?: boolean,
    msgPropNameOrMsg?: string) => {

    if (!topicName) return;

    if (!clientContexts)
        clientContexts = [];

    clientContexts.push({ name: 'is_module_agnostic', value: isModuleAgnostic ? 'true' : 'false' });
    clientContexts.push({ name: 'is_person_agnostic', value: isPersonAgnostic ? 'true' : 'false' });
    clientContexts.push({ name: 'msgPropNameOrMsg', value: msgPropNameOrMsg ?? '' });

    const notificatonData = new NotificationSenderData();
    notificatonData.clientContexts = clientContexts;
    notificatonData.notificationTypeName = notificationTypeName;
    notificatonData.audienceType = audienceType;// ?? AudienceType.ALL_USERS;
    notificatonData.audiences = audiences;
    notificatonData.data = data;

    new Observable(topicName).publish(notificatonData);
};

export const subscribeToSenderNotification = (uniqueRegistryKey: string, cb: (data: NotificationSenderData) => void) => {
    if (!cb || !uniqueRegistryKey) return;
    // @ts-ignore
    if (window[uniqueRegistryKey]) return;//ignore if already registered
    window[uniqueRegistryKey] = true;
    new Observable(INTERNAL_NOTIFICATION_SEND).subscribe(cb);
}

export const subscribeToSenderNotificationByTopic = (topicName: string, cb: (data: NotificationSenderData) => void) => {
    if (!topicName || !cb) return;
    new Observable(topicName).subscribe(cb);
}

export const publishReceivedNotification = (data: NotificationReceivedResponse) => {
    new Observable(INTERNAL_NOTIFICATION_RECEIVE).publish(data);
}

export const publishReceivedNotificationByTopic = (topicName: string, data: NotificationReceivedResponse) => {
    if (!topicName) return;
    new Observable(topicName).publish(data);
}

export const publishReceivedNotificationWithParams = (notificationTypeName: string,
    clientContexts?: NotificationClientContext[],
    data?: string) => {
    const notificatonData = new NotificationReceivedResponse();
    notificatonData.clientContexts = clientContexts;
    notificatonData.notificationTypeName = notificationTypeName;
    notificatonData.data = data;
    new Observable(INTERNAL_NOTIFICATION_RECEIVE).publish(notificatonData);
}

export const publishReceivedNotificationWithParamsByTopic = (topicName: string, notificationTypeName: string,
    clientContexts?: NotificationClientContext[],
    data?: string) => {
    const notificatonData = new NotificationReceivedResponse();
    notificatonData.clientContexts = clientContexts;
    notificatonData.notificationTypeName = notificationTypeName;
    notificatonData.data = data;
    if (!topicName) return;
    new Observable(topicName).publish(notificatonData);
}

export const subscribeToReceivedNotification = (uniqueRegistryKey: string, cb: (data: NotificationReceivedResponse) => void) => {
    if (!cb || !uniqueRegistryKey) return;
    // @ts-ignore
    if (window[uniqueRegistryKey]) return;//ignore if already registered
    window[uniqueRegistryKey] = true;
    new Observable(INTERNAL_NOTIFICATION_RECEIVE).subscribe(cb);
}

export const subscribeToReceivedNotificationByTopic = (topicName: string, cb: (data: NotificationReceivedResponse) => void) => {
    if (!topicName || !cb) return;
    new Observable(INTERNAL_NOTIFICATION_RECEIVE).subscribe(cb);
}

export class RTNotificationsHandlerParams {
    getAppSettings: () => any;
    notificationTypes?: {
        name: string,
        msgPropNameOrMsg?: string,
        //shouldHaveSamePatientContext?: boolean, 
        //shouldHaveSameModuleContext?: boolean, 
        currentModuleName?: string,
        additionalConds?: (response: NotificationReceivedResponse) => boolean,
        hideMessage?: boolean,
        postDisplay?: (response: NotificationReceivedResponse) => void
    }[];
}


export class NotificationSenderData {
    notificationTypeName: string;
    clientContexts?: NotificationClientContext[];
    data?: string;
    audienceType: AudienceType;
    audiences: NotificationAudience[];//Required only for 'Specifc users' - audience type
    isModuleAgnostic?: boolean;
    isPersonAgnostic?: boolean;
    msgPropNameOrMsg?: string;
}


export class NotificationClientContext {
    name: string
    value: string
}

export class NotificationAudience {
    name?: string;
    userId?: string;
    email: string;
    phoneNo?: string;
}

export class NotificationReceivedResponse {
    notificationTypeName: string;
    clientContexts?: NotificationClientContext[];
    data: string;//to be evolved
}

export enum AudienceType {
    ALL_USERS = 'all_users',
    SPECIFIED_USERS = 'specified_users',
    ALL_USERS_EXCEPT_SENDER = 'all_users_except_sender',
    ONLY_TO_SENDER = 'only_to_sender',
    ALL_SESSIONS_EXCEPT_CURRENT_SESSION = 'all_sessions_except_current_session',
    ONLY_TO_SENDER_SESSION = 'only_to_sender_session'
}

export class RTNoificationUtilService {
    public rtNotificationsHandler(notificationParams: RTNotificationsHandlerParams, response: NotificationReceivedResponse) {

        //subscribeToReceivedNotification((response: NotificationReceivedResponse) => {
        console.log('notification params=', notificationParams);

        if (!notificationParams) return;

        let appsettings = notificationParams.getAppSettings();
        console.log('received notification + appsettings', response);
        console.log('received notification + appsettings', appsettings);

        if (!appsettings) return;

        if (!appsettings || !appsettings.can_receive_notification || !response || !response.notificationTypeName) return;

        console.log('received notification', response);

        const { modulesKV, senderModuleKV, personIdKV, encounterIdKV, currentPersonId, currentModule, isModuleAgnosticKV, isPersonAgnosticKV, msgKeyParamOrMsgKV } = this.getContextParamsFromResponse(response);

        const notificationToDisplay = notificationParams.notificationTypes?.find(rec => rec.name.toUpperCase() === response.notificationTypeName.toUpperCase());

        console.log('received notification with conditions satisfied-Step 1');

        const isPatientAgnostic = (isPersonAgnosticKV && isPersonAgnosticKV.value && (isPersonAgnosticKV.value.toLowerCase() == 'true'))

        if (!isPatientAgnostic) {
            const isSamePersonIdInContext = personIdKV && personIdKV.value == currentPersonId?.value;
            if (!isSamePersonIdInContext) return;
        }

        console.log('received notification with conditions satisfied-Step 2 - Same patient or ignored');

        if (!notificationToDisplay) return;
        console.log('received notification with conditions satisfied-Step 3 - Has Notification Type');

        //check the sender and the current module is same
        const isSameAsSenderModule = (senderModuleKV && senderModuleKV.value && currentModule && currentModule.value
            && (senderModuleKV.value.toLowerCase() == currentModule.value.toLowerCase()))

        if (!isSameAsSenderModule) return;

        /* module check can be ignored - as notification type has matched --ignore this comment
        let isSameModuleInContext = false
        if(notificationToDisplay.currentModuleName) {
            isSameModuleInContext = currentModule && currentModule.value && currentModule.value.toLowerCase() === notificationToDisplay.currentModuleName.toLowerCase();
        } else {
            isSameModuleInContext = validateModuleContext(isModuleAgnosticKV,currentModule,modulesKV);
        }
 
        if (!isSameModuleInContext) return;
        */

        console.log('received notification with conditions satisfied-Step 4 - Same Context or ignored');

        if (notificationToDisplay && notificationToDisplay.additionalConds && !notificationToDisplay.additionalConds(response)) return;

        console.log('received notification with conditions satisfied-Step 5 - AddnlConds or ignored');

        let msg = '';
        //give preference to what is in the context
        if (msgKeyParamOrMsgKV && msgKeyParamOrMsgKV.value) {
            msg = appsettings[msgKeyParamOrMsgKV.value] || msgKeyParamOrMsgKV.value;
        }

        if (!msg && (notificationToDisplay && notificationToDisplay.msgPropNameOrMsg))
            msg = appsettings[notificationToDisplay.msgPropNameOrMsg] || notificationToDisplay.msgPropNameOrMsg;

        const canShowMsg = (!notificationToDisplay || !notificationToDisplay.hideMessage);

        //if (canShowMsg)
        //notificationParams.toastrService.error(msg, 'Notification', { onActivateTick: true, timeOut: 50, extendedTimeOut: 500, disableTimeOut: 'timeOut', closeButton: true });
        
        if (canShowMsg) publishToShowNotificationMessage(msg);

        notificationToDisplay?.postDisplay?.(response);
        console.log('received notification with conditions satisfied', response);
        //});
    }



    //This will not consider the notification type and will display message for all notifications
    //provided matching patient or patient agnostic and module agnostic
    public rtNotificationsModuleAgnosticMessageHandler(notificationParams: RTNotificationsHandlerParams, response: NotificationReceivedResponse) {
        //subscribeToReceivedNotification((response: NotificationReceivedResponse)=> {

        if (!notificationParams) return;

        let appsettings = notificationParams.getAppSettings();
        console.log('received notification + appsettings', response);
        console.log('received notification + appsettings', appsettings);

        if (!appsettings) return;

        if (!appsettings || !appsettings.can_receive_notification || !response || !response.notificationTypeName) return;

        console.log('received notification', response);

        const { modulesKV, currentModule, personIdKV, currentPersonId, isModuleAgnosticKV, isPersonAgnosticKV, msgKeyParamOrMsgKV } = this.getContextParamsFromResponse(response);

        const isModuleAgnostic = (isModuleAgnosticKV && isModuleAgnosticKV.value && (isModuleAgnosticKV.value.toLowerCase() == 'true'))

        if (!isModuleAgnostic) return;

        console.log('received notification with conditions in terminus handler satisfied-Step 1 - Module agnostic');

        const isPatientAgnostic = (isPersonAgnosticKV && isPersonAgnosticKV.value && (isPersonAgnosticKV.value.toLowerCase() == 'true'))

        if (!isPatientAgnostic) {
            const isSamePersonIdInContext = personIdKV && personIdKV.value == currentPersonId?.value;
            if (!isSamePersonIdInContext) return;
        }

        console.log('received notification with conditions in terminus handler satisfied-Step 2 - Same patient or ignored');

        let msg = '';//response.notificationTypeName;
        if (msgKeyParamOrMsgKV && msgKeyParamOrMsgKV.value) {
            msg = appsettings[msgKeyParamOrMsgKV.value] || msgKeyParamOrMsgKV.value;
        }

        msg = msg || appsettings[response.notificationTypeName];
        if (msg) publishToShowNotificationMessage(msg);

        //if (msg)
        //    notificationParams.toastrService.error(msg, 'Notification', { onActivateTick: true, timeOut: 50, extendedTimeOut: 500, disableTimeOut: 'timeOut', closeButton: true });
        //});
    }

    private validateModuleContext(isModuleAgnosticKV, currentModule, modulesKV): boolean {
        //if module agnostic, continue or if current module is any module in the client context received
        const isModuleAgnostic = (isModuleAgnosticKV && isModuleAgnosticKV.value && (isModuleAgnosticKV.value.toLowerCase() == 'true'))

        if (isModuleAgnostic) return true;
        //it is not module agnostic - so check if current module is any of the modules in client context
        if (!modulesKV || !modulesKV.value) return true;//sender is not specific of module

        if (!currentModule) return false;

        const moduleNames = modulesKV.value.split('|')?.find(rec => rec.toLowerCase() === currentModule.value);

        if (moduleNames && moduleNames.length) return true;

        return false;
    }

    private getContextParamsFromResponse(response: NotificationReceivedResponse) {
        const modulesKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'modules');
        const senderModuleKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'module');
        const personIdKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'personid');
        const encounterIdKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'encounterid');
        const currentPersonId = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'current_person_id');
        const currentModule = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'current_module');
        const isModuleAgnosticKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'is_module_agnostic');
        const isPersonAgnosticKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'is_person_agnostic');
        const msgKeyParamOrMsgKV = response.clientContexts.find(rec => rec.name && rec.name.toLowerCase() === 'msgpropnameormsg');

        return { modulesKV, senderModuleKV, personIdKV, encounterIdKV, currentPersonId, currentModule, isModuleAgnosticKV, isPersonAgnosticKV, msgKeyParamOrMsgKV };
    }
} 
