/* eslint-disable import-x/no-nodejs-modules */
export {};

declare const require: (id: string) => any;
const assert = require('node:assert/strict');
const { createMovingPanelFit } = require('../src/灯火通明/moving-panel-fit');

const makePanel = (height = '800px') => {
  const properties = new Map<string, { value: string; priority: string }>();
  const panel = {
    top: 35,
    style: {
      getPropertyValue: (name: string) => properties.get(name)?.value ?? '',
      getPropertyPriority: (name: string) => properties.get(name)?.priority ?? '',
      setProperty: (name: string, value: string, priority = '') => {
        if (value) properties.set(name, { value, priority });
        else properties.delete(name);
      },
      removeProperty: (name: string) => properties.delete(name),
    },
    getBoundingClientRect: () => ({ top: panel.top }),
  };
  panel.style.setProperty('height', height);
  panel.style.setProperty('width', '1200px');
  panel.style.setProperty('inset', '35px 0px 2px');
  return panel;
};

{
  const fit = createMovingPanelFit();
  const panel = makePanel('');
  fit.sync(panel, 900, true);
  assert.equal(panel.style.getPropertyValue('height'), '');
  assert.equal(panel.style.getPropertyValue('max-height'), '');
}

{
  const fit = createMovingPanelFit();
  const panel = makePanel('336px');
  panel.top = 15;
  fit.sync(panel, 351.125, true);
  assert.equal(panel.style.getPropertyValue('height'), '336.125px');
  assert.equal(panel.style.getPropertyValue('max-height'), '336.125px');
  assert.equal(panel.style.getPropertyValue('width'), '1200px');
  assert.equal(panel.style.getPropertyValue('inset'), '35px 0px 2px');

  panel.top = 40;
  panel.style.setProperty('height', '870px');
  fit.sync(panel, 919, true);
  assert.equal(panel.style.getPropertyValue('height'), '879px');
  fit.dispose();
  assert.equal(panel.style.getPropertyValue('height'), '870px');
  assert.equal(panel.style.getPropertyValue('max-height'), '');
}

{
  const fit = createMovingPanelFit();
  const panel = makePanel();
  fit.sync(panel, 900, true);
  panel.style.setProperty('height', '460px');
  fit.sync(panel, 900, false);
  assert.equal(panel.style.getPropertyValue('height'), '460px');
  assert.equal(panel.style.getPropertyValue('max-height'), '');
  fit.sync(panel, 900, false);
  assert.equal(panel.style.getPropertyValue('height'), '460px');
}

{
  const fit = createMovingPanelFit();
  const panel = makePanel();
  fit.sync(panel, 900, true);
  panel.style.removeProperty('height');
  panel.style.removeProperty('inset');
  fit.sync(panel, 900, false);
  assert.equal(panel.style.getPropertyValue('height'), '');
  assert.equal(panel.style.getPropertyValue('max-height'), '');
  assert.equal(panel.style.getPropertyValue('inset'), '');
}

{
  const fit = createMovingPanelFit();
  const panel = makePanel();
  panel.style.setProperty('max-height', '950px', 'important');
  fit.sync(panel, 900, true);
  fit.dispose();
  assert.equal(panel.style.getPropertyValue('height'), '800px');
  assert.equal(panel.style.getPropertyValue('max-height'), '950px');
  assert.equal(panel.style.getPropertyPriority('max-height'), 'important');
}

{
  const fit = createMovingPanelFit();
  const panel = makePanel();
  fit.sync(panel, 900, true);
  fit.sync(panel, Number.NaN, true);
  fit.sync(panel, 0, true);
  assert.equal(panel.style.getPropertyValue('height'), '865px');
  fit.sync(null, 900, false);
  assert.equal(panel.style.getPropertyValue('height'), '800px');
  assert.equal(panel.style.getPropertyValue('max-height'), '');
}

console.info('灯火通明移动面板适配校验通过：原生布局、底边贴合、手动拖拽、Reset 与卸载恢复');
