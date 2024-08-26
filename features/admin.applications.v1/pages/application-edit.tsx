/**
 * Copyright (c) 2023-2024, WSO2 LLC. (https://www.wso2.com).
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

import Alert from "@oxygen-ui/react/Alert";
import AlertTitle from "@oxygen-ui/react/AlertTitle";
import Card from "@oxygen-ui/react/Card";
import Grid from "@oxygen-ui/react/Grid";
import { useRequiredScopes } from "@wso2is/access-control";
import ApplicationTemplateMetadataProvider from
    "@wso2is/admin.application-templates.v1/provider/application-template-metadata-provider";
import ApplicationTemplateProvider from "@wso2is/admin.application-templates.v1/provider/application-template-provider";
import { ConnectionUIConstants } from "@wso2is/admin.connections.v1/constants/connection-ui-constants";
import {
    AppConstants,
    AppState,
    FeatureConfigInterface,
    history
} from "@wso2is/admin.core.v1";
import { applicationConfig } from "@wso2is/admin.extensions.v1/configs/application";
import useExtensionTemplates from "@wso2is/admin.template-core.v1/hooks/use-extension-templates";
import { ExtensionTemplateListInterface } from "@wso2is/admin.template-core.v1/models/templates";
import { isFeatureEnabled } from "@wso2is/core/helpers";
import { AlertLevels, IdentifiableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { Field, Forms } from "@wso2is/forms";
import {
    AnimatedAvatar,
    AppAvatar,
    ConfirmationModal,
    Hint,
    LabelWithPopup,
    Popup,
    TabPageLayout
} from "@wso2is/react-components";
import { AxiosError } from "axios";
import cloneDeep from "lodash-es/cloneDeep";
import React, { FunctionComponent, MutableRefObject, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { RouteComponentProps } from "react-router";
import { Dispatch } from "redux";
import { CardContent, Divider, Label } from "semantic-ui-react";
import { updateAuthProtocolConfig } from "../api/application";
import { useGetApplication } from "../api/use-get-application";
import useGetApplicationInboundConfigs from "../api/use-get-application-inbound-configs";
import { EditApplication } from "../components/edit-application";
import { InboundProtocolDefaultFallbackTemplates } from "../components/meta/inbound-protocols.meta";
import { ApplicationManagementConstants } from "../constants";
import CustomApplicationTemplate
    from "../data/application-templates/templates/custom-application/custom-application.json";
import {
    ApplicationAccessTypes,
    ApplicationInterface,
    ApplicationTemplateListItemInterface,
    OIDCDataInterface,
    State,
    SupportedAuthProtocolTypes,
    idpInfoTypeInterface
} from "../models";
import { ApplicationManagementUtils } from "../utils/application-management-utils";
import { ApplicationTemplateManagementUtils } from "../utils/application-template-management-utils";
import "./application-edit.scss";
import { Typography } from "@mui/material";
import Button from "@oxygen-ui/react/Button";
import classNames from "classnames";

/**
 * Prop types for the applications edit page component.
 */
export interface ApplicationEditPageInterface extends IdentifiableComponentInterface, RouteComponentProps {
}

/**
 * Application Edit page component.
 *
 * @param props - Props injected to the component.
 *
 * @returns Application edit page.
 */
const ApplicationEditPage: FunctionComponent<ApplicationEditPageInterface> = (
    props: ApplicationEditPageInterface
): ReactElement => {

    const {
        location,
        [ "data-componentid" ]: componentId
    } = props;

    const urlSearchParams: URLSearchParams = new URLSearchParams(location.search);

    const { t } = useTranslation();

    const dispatch: Dispatch = useDispatch();

    const appDescElement: React.MutableRefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

    const {
        templates: extensionApplicationTemplates
    } = useExtensionTemplates();

    const applicationTemplates: ApplicationTemplateListItemInterface[] = useSelector(
        (state: AppState) => state.application.templates);
    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.ui.features);
    const tenantDomain: string = useSelector((state: AppState) => state.auth.tenantDomain);

    // Check if the user has the required scopes to update the application.
    const hasApplicationUpdatePermissions: boolean = useRequiredScopes(featureConfig?.applications?.scopes?.update);

    const [ applicationId, setApplicationId ] = useState<string>(undefined);
    const [ applicationTemplate, setApplicationTemplate ] = useState<ApplicationTemplateListItemInterface>(undefined);
    const [
        extensionApplicationTemplate,
        setExtensionApplicationTemplate
    ] = useState<ExtensionTemplateListInterface>(undefined);
    const [ isApplicationRequestLoading, setApplicationRequestLoading ] = useState<boolean>(undefined);
    const [ inboundProtocolList, setInboundProtocolList ] = useState<string[]>(undefined);
    const [ inboundProtocolConfigs, setInboundProtocolConfigs ] = useState<Record<string, any>>(undefined);
    const [ isDescTruncated, setIsDescTruncated ] = useState<boolean>(false);

    const [ isConnectedAppsRedirect, setisConnectedAppsRedirect ] = useState(false);
    const [ callBackIdpID, setcallBackIdpID ] = useState<string>();
    const [ callBackIdpName, setcallBackIdpName ] = useState<string>();
    const [ callBackRedirect, setcallBackRedirect ] = useState<string>();

    const {
        data: application,
        mutate: mutateApplicationGetRequest,
        error: applicationGetRequestError
    } = useGetApplication(applicationId, !!applicationId);

    const [ viewBannerDetails, setViewBannerDetails ] = useState<boolean>(false);
    const [ displayBanner, setDisplayBanner ] = useState<boolean>(false);
    const {
        data: applicationInboundConfigData,
        isLoading: isBannerDataLoading
    } = useGetApplicationInboundConfigs(application?.id, SupportedAuthProtocolTypes.OIDC, !!application?.id);
    const [ applicationInboundConfig, setApplicationInboundConfig ] = useState<OIDCDataInterface>(undefined);
    const [ useClientIdAsSubClaimForAppTokens, setUseClientIdAsSubClaimForAppTokens ] = useState<boolean>(false);
    const [ omitUsernameInIntrospectionRespForAppTokens, setOmitUsernameInIntrospectionRespForAppTokens ]
        = useState<boolean>(false);
    const useClientIdAsSubClaimForAppTokensElement: MutableRefObject<HTMLElement> = useRef<HTMLElement>();
    const omitUsernameInIntrospectionRespForAppTokensElement: MutableRefObject<HTMLElement> = useRef<HTMLElement>();
    const [ bannerUpdateLoading, setBannerUpdateLoading ] = useState<boolean>(false);
    const [ showConfirmationModal, setShowConfirmationModal ] = useState<boolean>(false);
    const [ formData, setFormdata ] = useState<any>(undefined);

    /**
     * Loads banner data.
     */
    useEffect(() => {
        if (!isBannerDataLoading) {
            setApplicationInboundConfig(applicationInboundConfigData);
        }
    }, [ applicationInboundConfigData, isBannerDataLoading ]);

    /**
     * Assign loaded banner data into config states.
     */
    useEffect(() => {
        if (applicationInboundConfig != undefined) {
            setUseClientIdAsSubClaimForAppTokens(applicationInboundConfig.useClientIdAsSubClaimForAppTokens);
            setOmitUsernameInIntrospectionRespForAppTokens(applicationInboundConfig
                .omitUsernameInIntrospectionRespForAppTokens);
            setDisplayBanner(!applicationInboundConfig.useClientIdAsSubClaimForAppTokens
                || !applicationInboundConfig.omitUsernameInIntrospectionRespForAppTokens);
        }
    }, [ applicationInboundConfig ]);

    /**
     * Load the template that the application is built on.
     */
    useEffect(() => {

        if (!(applicationTemplates
                && applicationTemplates instanceof Array
                && applicationTemplates.length > 0)) {

            /**
             * What's this?
             *
             * When navigating to an application using the direct url i.e.,
             * /t/foo/develop/applications/:id#tab=1 this component will be
             * mounted. But you see this {@link applicationTemplates}?; it is
             * loaded elsewhere. For some reason, requesting the state from
             * {@link useSelector} always returns `undefined` when
             * directly navigating or refreshing the page. Therefore; it hangs
             * without doing anything. It will show a overlay loader but
             * that's it. Nothing happens afterwards.
             *
             * So, as a workaround; if for some reason, the {@link useSelector}
             * return no data, we will manually emit the event
             * {@link ApplicationActionTypes.SET_APPLICATION_TEMPLATES}. So, doing
             * that ensures we load the application templates again.
             *
             * Consider this as a **failsafe workaround**. We shouldn't rely
             * on this. This may get removed in the future.
             */
            ApplicationTemplateManagementUtils
                .getApplicationTemplates()
                .finally();

            return;
        }

    }, [ applicationTemplates ]);

    /**
     * Fetch the application details on initial component load.
     */
    useEffect(() => {
        const path: string[] = history?.location?.pathname?.split("/");
        const id: string = path[ path?.length - 1 ];

        setApplicationId(id);
    }, []);

    const determineApplicationTemplate = (applicationData: ApplicationInterface): ApplicationInterface => {

        const getTemplate = (templateId: string): ApplicationTemplateListItemInterface => {
            if (templateId === ApplicationManagementConstants.CUSTOM_APPLICATION_OIDC
                || templateId === ApplicationManagementConstants.CUSTOM_APPLICATION_SAML
                || templateId === ApplicationManagementConstants.CUSTOM_APPLICATION_PASSIVE_STS) {
                return applicationTemplates?.find((template: ApplicationTemplateListItemInterface) =>
                    template?.id === CustomApplicationTemplate.id);
            }

            return applicationTemplates?.find(
                (template: ApplicationTemplateListItemInterface) => {
                    return template?.id === templateId;
                });
        };

        let template: ApplicationTemplateListItemInterface = getTemplate(applicationData?.templateId);

        /**
         * This condition block will help identify the applications created from templates
         * on the extensions management API side.
         */
        if (!template) {
            const extensionTemplate: ExtensionTemplateListInterface = extensionApplicationTemplates?.find(
                (template: ExtensionTemplateListInterface) => {
                    return template?.id === applicationData?.templateId;
                }
            );

            if (extensionTemplate) {
                setExtensionApplicationTemplate(extensionTemplate);

                const relatedOldTemplateId: string = InboundProtocolDefaultFallbackTemplates.get(
                    applicationData?.inboundProtocols?.[ 0 /*We pick the first*/ ]?.type
                ) ?? ApplicationManagementConstants.CUSTOM_APPLICATION_OIDC;

                applicationData.templateId = relatedOldTemplateId;

                template = getTemplate(relatedOldTemplateId);
            }
        }

        setApplicationTemplate(template);

        setApplicationRequestLoading(false);

        return applicationData;
    };

    const moderatedApplicationData: ApplicationInterface = useMemo(() => {
        if (!isApplicationRequestLoading) {
            setApplicationRequestLoading(true);
        }

        if (!applicationTemplates || !extensionApplicationTemplates || !application) {
            return null;
        }

        const clonedApplication: ApplicationInterface = cloneDeep(application);

        /**
         * If there's no application {@link ApplicationInterface.templateId}
         * in the application instance, then we manually bind a templateId. You
         * may ask why templateId is null at this point? Well, one reason
         * is that, if you create an application via the API, the templateId
         * is an optional property in the model instance.
         *
         *      So, if someone creates one without it, we don't have a template
         * to bootstrap the model. When that happens the edit view will not
         * work properly.
         *
         * We have added a mapping for application's inbound protocol
         * {@link InboundProtocolDefaultFallbackTemplates} to pick a default
         * template if none is present. One caveat is that, if we couldn't
         * find any template from the fallback mapping, we always assign
         * {@link ApplicationManagementConstants.CUSTOM_APPLICATION_OIDC} to it.
         * Additionally @see InboundFormFactory.
         */
        if (!clonedApplication?.advancedConfigurations?.fragment && !clonedApplication?.templateId) {
            if (clonedApplication?.inboundProtocols?.length > 0) {
                clonedApplication.templateId = InboundProtocolDefaultFallbackTemplates.get(
                    clonedApplication?.inboundProtocols?.[ 0 /*We pick the first*/ ]?.type
                ) ?? ApplicationManagementConstants.CUSTOM_APPLICATION_OIDC;

                return determineApplicationTemplate(clonedApplication);
            }

            setApplicationRequestLoading(false);

            return clonedApplication;
        }

        return determineApplicationTemplate(clonedApplication);
    }, [
        applicationTemplates,
        extensionApplicationTemplates,
        application
    ]);

    /**
     * Handles the application get request error.
     */
    useEffect(() => {
        if (!applicationGetRequestError) {
            return;
        }

        if (applicationGetRequestError.response?.data?.description) {
            dispatch(addAlert({
                description: applicationGetRequestError.response.data.description,
                level: AlertLevels.ERROR,
                message: t("applications:notifications.fetchApplication.error.message")
            }));

            return;
        }

        dispatch(addAlert({
            description: t("applications:notifications.fetchApplication" +
                ".genericError.description"),
            level: AlertLevels.ERROR,
            message: t("applications:notifications.fetchApplication.genericError." +
                "message")
        }));
    }, [ applicationGetRequestError ]);

    useEffect(() => {
        /**
         * What's the goal of this effect?
         * To figure out the application's description is truncated or not.
         *
         * Even though {@link useRef} calls twice, the PageLayout component doesn't render
         * the passed children immediately (it will use a placeholder when it's loading),
         * when that happens the relative element always returns 0 as the offset height
         * and width. So, I'm relying on this boolean variable {@link isApplicationRequestLoading}
         * to re-render it for the third time, so it returns correct values for figuring out
         * whether the element's content is truncated or not.
         *
         * Please refer implementation details of {@link PageHeader}, if you check its
         * heading content, you can see that it conditionally renders first. So, for us
         * to correctly figure out the offset width and scroll width of the target
         * element we need it to be persistently mounted inside the {@link Header}
         * element.
         *
         * What exactly happens inside this effect?
         *
         * 1st Call -
         *  React calls this with a `null` value for {@link appDescElement}
         *  (This is expected in useRef())
         *
         * 2nd Call -
         *  React updates the {@link appDescElement} with the target element.
         *  But {@link PageHeader} will immediately unmount it (because there's a request is ongoing).
         *  When that happens, for "some reason" we always get \{ offsetWidth, scrollWidth
         *  and all the related attributes \} as zero or null.
         *
         * 3rd Call -
         *  So, whenever there's some changes to {@link isApplicationRequestLoading}
         *  we want React to re-update to reference so that we can accurately read the
         *  element's measurements (once after a successful load the {@link PageHeader}
         *  will try to render the component we actually pass down the tree)
         *
         *  For more additional context please refer comment:
         *  @see https://github.com/wso2/identity-apps/pull/3028#issuecomment-1123847668
         */
        if (appDescElement) {
            const nativeElement: HTMLDivElement = appDescElement?.current;

            if (nativeElement && (nativeElement.offsetWidth < nativeElement.scrollWidth)) {
                setIsDescTruncated(true);
            }
        }
    }, [ appDescElement, isApplicationRequestLoading ]);

    /**
    * Fetch the identity provider id & name when calling the app edit through connected apps
    */
    useEffect(() => {
        if (typeof history.location.state !== "object") {
            return;
        }

        setisConnectedAppsRedirect(true);
        const idpInfo: idpInfoTypeInterface = history.location.state as idpInfoTypeInterface;

        setcallBackIdpID(idpInfo.id);
        setcallBackIdpName(idpInfo.name);
        idpInfo?.redirectTo && setcallBackRedirect(idpInfo.redirectTo);
    });

    /**
     * Push to 404 if application edit feature is disabled.
     */
    useEffect(() => {
        if (!featureConfig || !featureConfig.applications) {
            return;
        }

        if (!isFeatureEnabled(featureConfig.applications,
            ApplicationManagementConstants.FEATURE_DICTIONARY.get("APPLICATION_EDIT"))) {

            history.push(AppConstants.getPaths().get("PAGE_NOT_FOUND"));
        }
    }, [ featureConfig ]);

    /**
     * Handles the back button click event.
     */
    const handleBackButtonClick = (): void => {
        if (!isConnectedAppsRedirect) {
            history.push(AppConstants.getPaths().get("APPLICATIONS"));
        } else {
            if (callBackRedirect === ApplicationManagementConstants.ROLE_CALLBACK_REDIRECT) {
                history.push({
                    pathname: AppConstants.getPaths().get("ROLE_EDIT").replace(":id", callBackIdpID),
                    state: ConnectionUIConstants.TabIds.CONNECTED_APPS
                });
            } else {
                history.push({
                    pathname: AppConstants.getPaths().get("IDP_EDIT").replace(":id", callBackIdpID),
                    state: ConnectionUIConstants.TabIds.CONNECTED_APPS
                });
            }
        }
    };

    /**
     * Called when an application is deleted.
     */
    const handleApplicationDelete = (): void => {
        history.push(AppConstants.getPaths().get("APPLICATIONS"));
    };

    /**
     * Called when an application updates.
     *
     * @param id - Application id.
     */
    const handleApplicationUpdate = (): void => {
        mutateApplicationGetRequest();
    };

    /**
     * Resolves the application status label.
     *
     * @returns Application status label.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const resolveApplicationStatusLabel = (): ReactElement => {

        if (!inboundProtocolList || !inboundProtocolConfigs) {
            return null;
        }

        if (inboundProtocolList.length === 0) {

            return (
                <LabelWithPopup
                    popupHeader={ t("applications:popups.appStatus.notConfigured.header") }
                    popupSubHeader={ t("applications:popups.appStatus.notConfigured.content") }
                    labelColor="yellow"
                />
            );
        }

        if (inboundProtocolList.length === 1
                && inboundProtocolList.includes(SupportedAuthProtocolTypes.OIDC)
                && inboundProtocolConfigs
                && inboundProtocolConfigs[ SupportedAuthProtocolTypes.OIDC ]) {

            if (inboundProtocolConfigs[ SupportedAuthProtocolTypes.OIDC ].state === State.REVOKED) {

                return (
                    <LabelWithPopup
                        popupHeader={ t("applications:popups.appStatus.revoked.header") }
                        popupSubHeader={ t("applications:popups.appStatus.revoked.content") }
                        labelColor="grey"
                    />
                );
            }
        }

        return (
            <LabelWithPopup
                popupHeader={ t("applications:popups.appStatus.active.header") }
                popupSubHeader={ t("applications:popups.appStatus.active.content") }
                labelColor="green"
            />
        );
    };

    /**
     * Returns if the application is readonly or not by evaluating the `readOnly` attribute in
     * URL, the `access` attribute in application info response && the scope validation.
     *
     * @returns If an application is Read Only or not.
     */
    const resolveReadOnlyState = (): boolean => {

        return urlSearchParams.get(ApplicationManagementConstants.APP_READ_ONLY_STATE_URL_SEARCH_PARAM_KEY) === "true"
            || moderatedApplicationData?.access === ApplicationAccessTypes.READ
            || !hasApplicationUpdatePermissions;
    };

    /**
     * Resolves the application template label.
     *
     * @returns Template label.
     */
    const resolveTemplateLabel = (): ReactElement => {
        if (moderatedApplicationData?.advancedConfigurations?.fragment) {
            return (
                <Label size="small">
                    { t("applications:list.labels.fragment") }
                </Label>
            );
        }

        if (extensionApplicationTemplate?.name) {
            return <Label size="small" className="">{ extensionApplicationTemplate?.name }</Label>;
        }

        if (applicationTemplate?.name) {
            return <Label size="small">{ applicationTemplate.name }</Label>;
        }

        return null;
    };

    /**
     * Resolves the application banner content.
     *
     * @returns Alert banner.
     */
    const resolveAlertBanner = (): ReactElement => {

        const classes: any = classNames( { "application-outdated-alert-expanded-view": viewBannerDetails } );

        return (
            !isBannerDataLoading && displayBanner &&
                (
                    <>
                        {
                            <>
                                <Alert
                                    className={ classes }
                                    severity="warning"
                                    action={
                                        (
                                            <>
                                                <Button
                                                    onClick={ () => setViewBannerDetails(!viewBannerDetails) }>
                                                    { t("applications:forms.inboundOIDC.sections"
                                                        + ".legacyApplicationTokens.alert.viewButton") }
                                                </Button>
                                                <Button
                                                    className="ignore-once-button"
                                                    onClick={ () => setDisplayBanner(false) }>
                                                    { t("applications:forms.inboundOIDC.sections"
                                                        + ".legacyApplicationTokens.alert.cancelButton") }
                                                </Button>
                                            </>
                                        )
                                    }
                                >
                                    <AlertTitle className="alert-title">
                                        <Trans components={ { strong: <strong/> } } >
                                            { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens"
                                                + ".alert.title") }
                                        </Trans>
                                    </AlertTitle>
                                    <Trans>
                                        { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens"
                                                    + ".alert.content") }
                                    </Trans>
                                </Alert>
                                <Card
                                    className="banner-detail-card"
                                    hidden={ !viewBannerDetails }
                                >
                                    <CardContent>
                                        { resolveBannerViewDetails() }
                                    </CardContent>
                                </Card>
                            </>
                        }
                        <Divider hidden />
                    </>
                )
        );
    };

    /**
     * Resolves the application banner view details section.
     *
     * @returns Alert banner details.
     */
    const resolveBannerViewDetails = (): ReactElement => {

        return (
            <Forms onSubmit={ handleBannerCheckBoxUpdate }>
                <Grid>
                    <Typography component="div">
                        <Trans
                            i18nKey={
                                t("applications:forms.inboundOIDC.sections"
                                        + ".legacyApplicationTokens.fields."
                                        + "commonInstruction")
                            }>
                            Change the customer-end applications accordingly to recieve the below updates.
                        </Trans>
                    </Typography>
                    <ol>
                        <li>
                            <Trans
                                i18nKey={
                                    t("applications:forms.inboundOIDC.sections"
                                        + ".legacyApplicationTokens.fields."
                                        + "useClientIdAsSubClaimForAppTokens.label")
                                }>
                            </Trans>
                            {
                                !applicationInboundConfig
                                    .useClientIdAsSubClaimForAppTokens && (
                                    <>
                                        <Field
                                            ref={ useClientIdAsSubClaimForAppTokensElement }
                                            name="useClientIdAsSubClaimForAppTokens"
                                            required={ false }
                                            type="checkbox"
                                            disabled={ false }
                                            value={ useClientIdAsSubClaimForAppTokens ?
                                                [ "useClientIdAsSubClaimForAppTokens" ]
                                                : [] }
                                            readOnly={ false }
                                            data-componentId={
                                                `${ componentId }-use-client-id-as-sub-claim-for-app-tokens` }
                                            children={ [
                                                {
                                                    label: t("applications:forms.inboundOIDC.sections."
                                                    + "legacyApplicationTokens.fields"
                                                    + ".useClientIdAsSubClaimForAppTokens.label"),
                                                    value: "useClientIdAsSubClaimForAppTokens"
                                                }
                                            ] }
                                            listen={ () =>
                                                setUseClientIdAsSubClaimForAppTokens(
                                                    !useClientIdAsSubClaimForAppTokens) }
                                        />
                                        <Hint>
                                            { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens."
                                                + "fields.useClientIdAsSubClaimForAppTokens.hint") }
                                        </Hint>
                                    </>
                                )
                            }
                        </li>
                        {
                            (!omitUsernameInIntrospectionRespForAppTokens
                            && !useClientIdAsSubClaimForAppTokens) &&
                        (
                            <Divider hidden />
                        )
                        }
                        <li>
                            <Trans
                                i18nKey={
                                    t("applications:forms.inboundOIDC.sections"
                                        + ".legacyApplicationTokens.fields."
                                        + "omitUsernameInIntrospectionRespForAppTokens.label")
                                }>
                                Application access token, Introspection response will not include
                                the <code>username</code> attribute.
                            </Trans>
                            {
                                (!applicationInboundConfig
                                    .omitUsernameInIntrospectionRespForAppTokens) &&
                                (
                                    <>
                                        <Field
                                            ref={ omitUsernameInIntrospectionRespForAppTokensElement }
                                            name="omitUsernameInIntrospectionRespForAppTokens"
                                            required={ false }
                                            type="checkbox"
                                            disabled={ false }
                                            value={ omitUsernameInIntrospectionRespForAppTokens ?
                                                [ "omitUsernameInIntrospectionRespForAppTokens" ]
                                                : [] }
                                            readOnly={ false }
                                            data-componentId={
                                                `${ componentId }-omit-username-in-introspection-resp-for-app-tokens` }
                                            children={ [
                                                {
                                                    label: t("applications:forms.inboundOIDC.sections"
                                                    + ".legacyApplicationTokens.fields."
                                                    + "omitUsernameInIntrospectionRespForAppTokens.label"),
                                                    value: "omitUsernameInIntrospectionRespForAppTokens"
                                                }
                                            ] }
                                            listen={ () => setOmitUsernameInIntrospectionRespForAppTokens(
                                                !omitUsernameInIntrospectionRespForAppTokens)
                                            }
                                        />
                                        <Hint>
                                            { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens."
                                            + "fields.omitUsernameInIntrospectionRespForAppTokens.hint") }
                                        </Hint>
                                    </>
                                )
                            }
                        </li>
                    </ol>
                </Grid>
                <Button
                    variant="contained"
                    disabled={ !useClientIdAsSubClaimForAppTokens && !omitUsernameInIntrospectionRespForAppTokens }
                    type="submit"
                    data-componentId={ `${componentId}-application-update-banner-button` }
                >
                    { t("common:update") }
                </Button>
                { showConfirmationModal && confirmationModal() }
            </Forms>
        );
    };

    /**
     * Resolves the update confirmation modal.
     *
     * @returns Confirmation modal.
     */
    const confirmationModal = () => {

        return (
            <ConfirmationModal
                primaryActionLoading={ bannerUpdateLoading }
                data-testid={ `${ componentId }-confirmation-modal` }
                onClose={ (): void => setShowConfirmationModal(false) }
                type="negative"
                open={ showConfirmationModal }
                assertionHint={ t("applications:forms.inboundOIDC.sections.legacyApplicationTokens"
                    + ".confirmationModal.assertionHint") }
                assertionType="checkbox"
                primaryAction="Confirm"
                secondaryAction="Cancel"
                onSecondaryActionClick={ (): void =>{
                    setShowConfirmationModal(false);
                } }
                onPrimaryActionClick={ handleBannerCheckBoxUpdateConfirmation }
                closeOnDimmerClick={ false }
            >
                <ConfirmationModal.Header data-testid={ `${ componentId }-confirmation-modal-header` }>
                    { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens"
                        + ".confirmationModal.header") }
                </ConfirmationModal.Header>
                <ConfirmationModal.Message
                    data-testid={ `${ componentId }-confirmation-modal-message` }
                    attached
                    negative
                >
                    { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens"
                        + ".confirmationModal.message") }
                </ConfirmationModal.Message>
                <ConfirmationModal.Content data-testid={ `${ componentId }-confirmation-modal-content` }>
                    { t("applications:forms.inboundOIDC.sections.legacyApplicationTokens"
                        + ".confirmationModal.content") }
                    <ol>
                        { formData["useClientIdAsSubClaimForAppTokens"] && (
                            <li>
                                {
                                    t("applications:forms.inboundOIDC.sections"
                                        + ".legacyApplicationTokens.fields."
                                        + "useClientIdAsSubClaimForAppTokens.label")
                                }
                            </li>
                        )
                        }
                        { formData["omitUsernameInIntrospectionRespForAppTokens"] && (
                            <li>
                                {
                                    t("applications:forms.inboundOIDC.sections"
                                        + ".legacyApplicationTokens.fields."
                                        + "omitUsernameInIntrospectionRespForAppTokens.label")
                                }
                            </li>
                        )
                        }
                    </ol>
                </ConfirmationModal.Content>
            </ConfirmationModal>
        );
    };

    /**
     * Handles banner content update action which prepares data.
     */
    const handleBannerCheckBoxUpdate = (formDataValues: any) => {

        // Todo: check if we need to send all configs. Though the method is PUT, it works as a PATCH.
        let values: any = { ...applicationInboundConfig };

        if (formDataValues.get("omitUsernameInIntrospectionRespForAppTokens")){
            values = {
                ...values,
                omitUsernameInIntrospectionRespForAppTokens:
                    formDataValues.get("omitUsernameInIntrospectionRespForAppTokens")?.length > 0
            };
        } else {
            values = {
                ...values,
                omitUsernameInIntrospectionRespForAppTokens: omitUsernameInIntrospectionRespForAppTokens
            };
        }

        if (formDataValues.get("useClientIdAsSubClaimForAppTokens")) {
            values = {
                ...values,
                useClientIdAsSubClaimForAppTokens:
                formDataValues.get("useClientIdAsSubClaimForAppTokens")?.length > 0
            };
        } else {
            values = {
                ...values,
                useClientIdAsSubClaimForAppTokens: useClientIdAsSubClaimForAppTokens
            };
        }

        setFormdata({ ...values });
        setShowConfirmationModal(true);
    };

    /**
     * Handles the banner data update action.
     */
    const handleBannerCheckBoxUpdateConfirmation = async (): Promise<void> => {

        setBannerUpdateLoading(true);

        return updateAuthProtocolConfig<OIDCDataInterface>(application?.id, formData, SupportedAuthProtocolTypes.OIDC)
            .then(() => {
                dispatch(addAlert({
                    description: t("applications:notifications.updateInboundProtocolConfig" +
                            ".success.description"),
                    level: AlertLevels.SUCCESS,
                    message: t("applications:notifications.updateInboundProtocolConfig" +
                            ".success.message")
                }));
            })
            .catch((error: AxiosError) => {
                if (error?.response?.data?.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: t("applications:notifications.updateInboundProtocolConfig" +
                                ".error.message")
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: t("applications:notifications.updateInboundProtocolConfig" +
                            ".genericError.description"),
                    level: AlertLevels.ERROR,
                    message: t("applications:notifications.updateInboundProtocolConfig" +
                            ".genericError.message")
                }));
            }).finally(() => {
                setUseClientIdAsSubClaimForAppTokens(formData.useClientIdAsSubClaimForAppTokens);
                setOmitUsernameInIntrospectionRespForAppTokens(formData.omitUsernameInIntrospectionRespForAppTokens);
                setDisplayBanner(!formData.useClientIdAsSubClaimForAppTokens ||
                    !formData.omitUsernameInIntrospectionRespForAppTokens);
                setShowConfirmationModal(false);
                setBannerUpdateLoading(false);
            });
    };

    return (
        <TabPageLayout
            pageTitle="Edit Application"
            title={ (
                <>
                    <span>{ moderatedApplicationData?.name }</span>
                    { /*TODO - Application status is not shown until the backend support for disabling is given
                        @link https://github.com/wso2/product-is/issues/11453
                        { resolveApplicationStatusLabel() }*/ }
                </>
            ) }
            contentTopMargin={ true }
            description={ (
                applicationConfig.editApplication.getOverriddenDescription(inboundProtocolConfigs?.oidc?.clientId,
                    tenantDomain, applicationTemplate?.name)
                    ?? (
                        <div className="with-label ellipsis" ref={ appDescElement }>
                            { resolveTemplateLabel() }
                            {
                                ApplicationManagementUtils.isChoreoApplication(moderatedApplicationData)
                                    && (<Label
                                        size="small"
                                        className="choreo-label no-margin-left"
                                    >
                                        { t("extensions:develop.apiResource.managedByChoreoText") }
                                    </Label>)
                            }
                            <Popup
                                disabled={ !isDescTruncated }
                                content={ moderatedApplicationData?.description }
                                trigger={ (
                                    <span>{ moderatedApplicationData?.description }</span>
                                ) }
                            />
                        </div>
                    )
            ) }
            image={
                applicationConfig.editApplication.getOverriddenImage(inboundProtocolConfigs?.oidc?.clientId,
                    tenantDomain)
                ?? (
                    moderatedApplicationData?.imageUrl
                        ? (
                            <AppAvatar
                                name={ moderatedApplicationData?.name }
                                image={ moderatedApplicationData?.imageUrl }
                                size="tiny"
                            />
                        )
                        : (
                            <AnimatedAvatar
                                name={ moderatedApplicationData?.name }
                                size="tiny"
                                floated="left"
                            />
                        )
                )
            }
            loadingStateOptions={ {
                count: 5,
                imageType: "square"
            } }
            isLoading={ isApplicationRequestLoading }
            backButton={ {
                "data-componentid": `${componentId}-page-back-button`,
                onClick: handleBackButtonClick,
                text: isConnectedAppsRedirect ? t("idp:connectedApps.applicationEdit.back",
                    { idpName: callBackIdpName }) : t("console:develop.pages.applicationsEdit.backButton")
            } }
            alertBanner={ resolveAlertBanner() }
            titleTextAlign="left"
            bottomMargin={ false }
            pageHeaderMaxWidth={ true }
            data-componentid={ `${ componentId }-page-layout` }
            truncateContent={ true }
            action={ (
                <>
                    {
                        applicationConfig.editApplication.getActions(
                            application?.id,
                            inboundProtocolConfigs?.oidc?.clientId,
                            tenantDomain,
                            componentId
                        )
                    }
                </>
            ) }
        >
            <ApplicationTemplateProvider
                template={ extensionApplicationTemplate }
            >
                <ApplicationTemplateMetadataProvider
                    template={ extensionApplicationTemplate }
                >
                    <EditApplication
                        application={ moderatedApplicationData }
                        featureConfig={ featureConfig }
                        isLoading={ isApplicationRequestLoading }
                        setIsLoading={ setApplicationRequestLoading }
                        onDelete={ handleApplicationDelete }
                        onUpdate={ handleApplicationUpdate }
                        template={ applicationTemplate }
                        data-componentid={ componentId }
                        urlSearchParams={ urlSearchParams }
                        getConfiguredInboundProtocolsList={ (list: string[]) => {
                            setInboundProtocolList(list);
                        } }
                        getConfiguredInboundProtocolConfigs={ (configs: Record<string, unknown>) => {
                            setInboundProtocolConfigs(configs);
                        } }
                        readOnly={ resolveReadOnlyState() }
                    />
                </ApplicationTemplateMetadataProvider>
            </ApplicationTemplateProvider>
        </TabPageLayout>
    );
};

/**
 * Default proptypes for the application edit page component.
 */
ApplicationEditPage.defaultProps = {
    "data-componentid": "application-edit"
};

/**
 * A default export was added to support React.lazy.
 * TODO: Change this to a named export once react starts supporting named exports for code splitting.
 * @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}
 */
export default ApplicationEditPage;
