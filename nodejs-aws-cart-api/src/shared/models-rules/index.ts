import { AppRequest } from '../models';

/**
 * @param {AppRequest} request
 * @returns {string}
 */
export function getUserIdFromRequest(request: AppRequest): string {
  // @ts-ignore
  // return request.user && request.user.id;
  return '1';
}
