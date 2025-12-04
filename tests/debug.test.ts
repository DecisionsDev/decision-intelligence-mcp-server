/*
 * Copyright contributors to the IBM ADS/Decision Intelligence MCP Server project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { setDebug, debug, isDebug } from '../src/debug.js';

describe('Debug module', () => {
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    console.error = jest.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });
  
  test('debug is disabled by default', () => {
    expect(isDebug()).toBe(false);
  });
  
  test('setDebug enables debugging', () => {
    setDebug(true);
    expect(isDebug()).toBe(true);
    
    setDebug(false);
    expect(isDebug()).toBe(false);
  });
  
  test('debug does not log when debugging is disabled', () => {
    setDebug(false);
    debug('test message');
    expect(console.error).not.toHaveBeenCalled();
  });
  
  test('debug logs when debugging is enabled', () => {
    setDebug(true);
    debug('test message');
    expect(console.error).toHaveBeenCalledWith('test message');
  });
  
  test('debug can handle multiple arguments', () => {
    setDebug(true);
    const obj = { key: 'value' };
    debug('test message', obj, 'another message');
    expect(console.error).toHaveBeenCalledWith('test message', obj, 'another message');
  });
});
