/**
 * Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com).
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

/**
 * Constants related to the root organization.
 *
 * This class contains constant values used for handling errors and statuses
 * related to the activation and deactivation of the root organization.
 *
 * @remarks
 * This class is not meant to be instantiated. It only provides static constants.
 *
 * @example
 * ```typescript
 * const errorMessage = RootOrganizationConstants.ROOT_ORGANIZATION_ACTIVATION_UPDATE_ERROR;
 * ```
 */
export default class RootOrganizationConstants {
    /**
     * Private constructor to avoid object instantiation from outside the class.
     */
    private constructor() {}

    public static readonly ROOT_ORGANIZATION_ACTIVATION_UPDATE_INVALID_STATUS_ERROR: string =
        "An invalid status code was received while updating the root organization activation status.";

    public static readonly ROOT_ORGANIZATION_ACTIVATION_UPDATE_ERROR: string =
        "An error occurred while updating the root organization activation status.";

    public static readonly ROOT_ORGANIZATION_METADATA_DELETE_ERROR: string =
        "An error occurred while deleting the root organization metadata.";

    public static readonly ROOT_ORGANIZATION_METADATA_DELETE_INVALID_STATUS_ERROR: string =
        "An invalid status code was received while deleting the root organization metadata.";
}
