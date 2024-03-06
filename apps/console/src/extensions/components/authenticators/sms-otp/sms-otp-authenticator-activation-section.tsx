/**
 * Copyright (c) 2022-2024, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IdentityAppsApiException } from "@wso2is/core/exceptions";
import { AlertLevels, IdentifiableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import React, { FunctionComponent, ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";
import { Checkbox, CheckboxProps } from "semantic-ui-react";
import { addSMSPublisher, deleteSMSPublisher, useSMSNotificationSenders } from "../../identity-providers/api";
import { SMSOTPConstants } from "../../identity-providers/constants";

/**
 * Interface for SMS OTP Authenticator Activation Section props.
 */
interface SmsOtpAuthenticatorActivationSectionInterface extends IdentifiableComponentInterface {
    onActivate: (isActivated: boolean) => void
}

/**
 * SMS OTP Authenticator Enable/Disable Section.
 *
 * @returns Functional component.
 */
export const SmsOtpAuthenticatorActivationSection: FunctionComponent<SmsOtpAuthenticatorActivationSectionInterface> = (
    props: SmsOtpAuthenticatorActivationSectionInterface
): ReactElement => {

    const { onActivate } = props;
    const { t } = useTranslation();
    const [ isEnableSMSOTP, setEnableSMSOTP ] = useState<boolean>(false);
    const dispatch: Dispatch = useDispatch();

    const {
        data: notificationSendersList,
        error: notificationSendersListFetchRequestError
    } = useSMSNotificationSenders();

    useEffect(() => {
        if (!notificationSendersListFetchRequestError) {
            if (notificationSendersList) {
                let enableSMSOTP: boolean = false;

                for (const notificationSender of notificationSendersList) {
                    const channelValues: {
                        key:string;
                        value:string;
                    }[] = notificationSender.properties ? notificationSender.properties : [];

                    if (notificationSender.name === "SMSPublisher") {
                        enableSMSOTP = true;
                        break;
                    }
                }
                setEnableSMSOTP(enableSMSOTP);
                onActivate(enableSMSOTP);
            }
        } else {
            dispatch(addAlert({
                description: t("extensions:develop.identityProviders.smsOTP.settings.errorNotifications" +
                    ".notificationSendersRetrievalError.description"),
                level: AlertLevels.ERROR,
                message:t("extensions:develop.identityProviders.smsOTP.settings.errorNotifications" +
                    ".notificationSendersRetrievalError.message")
            }));
        }
    }, [ notificationSendersList, notificationSendersListFetchRequestError ]);

    /**
     * Handle enable/disable SMS OTP.
     *
     * @param event - Event.
     * @param data - Data.
     */
    const handleUpdateSMSPublisher = ( event: React.FormEvent<HTMLInputElement>, data: CheckboxProps) => {
        
        // Create SMS Publisher only if does not exist.
        if (notificationSendersList.length === 0) {
            if (data.checked) {
                // Add SMS Publisher when enabling the feature.
                addSMSPublisher().then(() => {
                    setEnableSMSOTP(true);
                    onActivate(true);
                }).catch(() => {
                    dispatch(addAlert({
                        description: t("extensions:develop.identityProviders.smsOTP.settings" +
                            ".errorNotifications.smsPublisherCreationError.description"),
                        level: AlertLevels.ERROR,
                        message: t("extensions:develop.identityProviders.smsOTP.settings" +
                            ".errorNotifications.smsPublisherCreationError.message")
                    }));
                });
            } else {
                // Delete SMS Publisher when enabling the feature.
                deleteSMSPublisher().then(() => {
                    setEnableSMSOTP(false);
                    onActivate(false);
                }).catch((error: IdentityAppsApiException) => {
                    const errorType : string = error.code === SMSOTPConstants.ErrorMessages
                        .SMS_NOTIFICATION_SENDER_DELETION_ERROR_ACTIVE_SUBS.getErrorCode() ? "activeSubs" :
                        ( error.code === SMSOTPConstants.ErrorMessages.
                            SMS_NOTIFICATION_SENDER_DELETION_ERROR_CONNECTED_APPS.getErrorCode() ? "connectedApps"
                            : "generic" );
    
                    dispatch(addAlert({
                        description: t("extensions:develop.identityProviders.smsOTP.settings." +
                            `errorNotifications.smsPublisherDeletionError.${errorType}.description`),
                        level: AlertLevels.ERROR,
                        message: t("extensions:develop.identityProviders.smsOTP.settings." +
                            `errorNotifications.smsPublisherDeletionError.${errorType}.message`)
                    }));
                });
            }
        } else {
            if (data.checked) {
                setEnableSMSOTP(true);
                onActivate(true);
            } else {
                setEnableSMSOTP(false);
                onActivate(false);
            }
        }
    };

    return (
        <>
            <Checkbox
                toggle
                label={ (!isEnableSMSOTP
                    ? t("extensions:develop.identityProviders.smsOTP.settings." +
                        "smsOtpEnableDisableToggle.labelEnable")
                    : t("extensions:develop.identityProviders.smsOTP.settings.smsOtpEnableDisableToggle.labelDisable"))
                }
                data-componentid="sms-otp-enable-toggle"
                checked={ isEnableSMSOTP }
                onChange={ (event: React.FormEvent<HTMLInputElement>, data: CheckboxProps): void => {
                    handleUpdateSMSPublisher(event, data);
                } }
                className="feature-toggle"
            />
        </>
    );
};

/**
 * Default props for the component.
 */
SmsOtpAuthenticatorActivationSection.defaultProps = {
    "data-componentid": "sms-otp-authenticator-activation-section"
};
