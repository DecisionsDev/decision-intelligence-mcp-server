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
