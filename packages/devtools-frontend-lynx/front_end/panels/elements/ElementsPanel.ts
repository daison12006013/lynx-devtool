// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import type * as Adorners from '../../ui/components/adorners/adorners.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AccessibilityTreeView} from './AccessibilityTreeView.js';
import * as ElementsComponents from './components/components.js';
import {ComputedStyleWidget} from './ComputedStyleWidget.js';

import type {ElementsTreeElement} from './ElementsTreeElement.js'; // eslint-disable-line no-unused-vars
import {ElementsTreeElementHighlighter} from './ElementsTreeElementHighlighter.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';
import type {MarkerDecorator} from './MarkerDecorator.js'; // eslint-disable-line no-unused-vars
import {MetricsSidebarPane} from './MetricsSidebarPane.js';
import {Events as StylesSidebarPaneEvents, StylesSidebarPane} from './StylesSidebarPane.js';

const UIStrings = {
  /**
  * @description Placeholder text for the search box the Elements Panel. Selector refers to CSS
  * selectors.
  */
  findByStringSelectorOrXpath: 'Find by string, selector, or `XPath`',
  /**
  * @description Button text for a button that takes the user to the Accessibility Tree View from the
  * DOM tree view, in the Elements panel.
  */
  switchToAccessibilityTreeView: 'Switch to Accessibility Tree view',
  /**
  * @description Button text for a button that takes the user to the DOM tree view from the
  * Accessibility Tree View, in the Elements panel.
  */
  switchToDomTreeView: 'Switch to DOM Tree view',
  /**
  * @description Label for a link to a rendering frame.
  */
  frame: 'Frame',
  /**
  * @description Tooltip for the the Computed Styles sidebar toggle in the Styles pane. Command to
  * open/show the sidebar.
  */
  showComputedStylesSidebar: 'Show Computed Styles sidebar',
  /**
  * @description Tooltip for the the Computed Styles sidebar toggle in the Styles pane. Command to
  * close/hide the sidebar.
  */
  hideComputedStylesSidebar: 'Hide Computed Styles sidebar',
  /**
  * @description Title of a pane in the Elements panel that shows computed styles for the selected
  * HTML element. Computed styles are the final, actual styles of the element, including all
  * implicit and specified styles.
  */
  computed: 'Computed',
  /**
  * @description Title of a pane in the Elements panel that shows the CSS styles for the selected
  * HTML element.
  */
  styles: 'Styles',
  /**
  * @description A context menu item to reveal a node in the DOM tree of the Elements Panel
  */
  revealInElementsPanel: 'Reveal in Elements panel',
  /**
  * @description Warning/error text displayed when a node cannot be found in the current page.
  */
  nodeCannotBeFoundInTheCurrent: 'Node cannot be found in the current page.',
  /**
  * @description Console warning when a user tries to reveal a non-node type Remote Object. A remote
  * object is a JavaScript object that is not stored in DevTools, that DevTools has a connection to.
  * It should correspond to a local node.
  */
  theRemoteObjectCouldNotBe: 'The remote object could not be resolved to a valid node.',
  /**
  * @description Console warning when the user tries to reveal a deferred DOM Node that resolves as
  * null. A deferred DOM node is a node we know about but have not yet fetched from the backend (we
  * defer the work until later).
  */
  theDeferredDomNodeCouldNotBe: 'The deferred `DOM` Node could not be resolved to a valid node.',
  /**
  * @description Text in Elements Panel of the Elements panel. Shows the current CSS Pseudo-classes
  * applicable to the selected HTML element.
  * @example {::after, ::before} PH1
  */
  elementStateS: 'Element state: {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const createAccessibilityTreeToggleButton = (isActive: boolean): HTMLButtonElement => {
  const button = document.createElement('button');
  if (isActive) {
    button.classList.add('axtree-button', 'axtree-button-active');
  } else {
    button.classList.add('axtree-button');
  }
  button.tabIndex = 0;
  button.title =
      isActive ? i18nString(UIStrings.switchToDomTreeView) : i18nString(UIStrings.switchToAccessibilityTreeView);
  const icon = new IconButton.Icon.Icon();
  const bgColor = isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)';
  icon.data = {iconName: 'accessibility-icon', color: bgColor, width: '16px', height: '16px'};
  button.appendChild(icon);
  return button;
};

let elementsPanelInstance: ElementsPanel;

export class ElementsPanel extends UI.Panel.Panel implements UI.SearchableView.Searchable,
                                                             SDK.TargetManager.SDKModelObserver<SDK.DOMModel.DOMModel>,
                                                             UI.View.ViewLocationResolver {
  _splitWidget: UI.SplitWidget.SplitWidget;
  _searchableView: UI.SearchableView.SearchableView;
  _contentElement: HTMLDivElement;
  _splitMode: _splitMode|null;
  _accessibilityTreeView: AccessibilityTreeView|undefined;
  _breadcrumbs: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs;
  _stylesWidget: StylesSidebarPane;
  _computedStyleWidget: ComputedStyleWidget;
  _metricsWidget: MetricsSidebarPane;
  _treeOutlines: Set<ElementsTreeOutline>;
  _treeOutlineHeaders: Map<ElementsTreeOutline, Element>;
  _gridStyleTrackerByCSSModel: Map<SDK.CSSModel.CSSModel, SDK.CSSModel.CSSPropertyTracker>;
  _searchResults!: {
    domModel: SDK.DOMModel.DOMModel,
    index: number,
    node: ((SDK.DOMModel.DOMNode | undefined)|null),
  }[]|undefined;
  _currentSearchResultIndex: number;
  _pendingNodeReveal: boolean;
  _adornerManager: ElementsComponents.AdornerManager.AdornerManager;
  _adornerSettingsPane: ElementsComponents.AdornerSettingsPane.AdornerSettingsPane|null;
  _adornersByName: Map<string, Set<Adorners.Adorner.Adorner>>;
  accessibilityTreeButton?: HTMLButtonElement;
  domTreeButton?: HTMLButtonElement;
  _selectedNodeOnReset?: SDK.DOMModel.DOMNode;
  _hasNonDefaultSelectedNode?: boolean;
  _searchConfig?: UI.SearchableView.SearchConfig;
  _omitDefaultSelection?: boolean;
  _notFirstInspectElement?: boolean;
  sidebarPaneView?: UI.View.TabbedViewLocation;
  _stylesViewToReveal?: UI.View.SimpleView;

  constructor() {
    super('elements');
    this.registerRequiredCSS('panels/elements/elementsPanel.css');
    this._splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'elementsPanelSplitViewState', 325, 325);
    this._splitWidget.addEventListener(
        UI.SplitWidget.Events.SidebarSizeChanged, this._updateTreeOutlineVisibleWidth.bind(this));
    this._splitWidget.show(this.element);

    this._searchableView = new UI.SearchableView.SearchableView(this, null);
    this._searchableView.setMinimumSize(25, 28);
    this._searchableView.setPlaceholder(i18nString(UIStrings.findByStringSelectorOrXpath));
    this._searchableView.handleFindShortcut();
    const stackElement = this._searchableView.element;

    this._contentElement = document.createElement('div');
    const crumbsContainer = document.createElement('div');
    if (Root.Runtime.experiments.isEnabled('fullAccessibilityTree')) {
      this._initializeFullAccessibilityTreeView(stackElement);
    }
    stackElement.appendChild(this._contentElement);
    stackElement.appendChild(crumbsContainer);

    this._splitWidget.setMainWidget(this._searchableView);
    this._splitMode = null;

    this._contentElement.id = 'elements-content';
    // FIXME: crbug.com/425984
    if (Common.Settings.Settings.instance().moduleSetting('domWordWrap').get()) {
      this._contentElement.classList.add('elements-wrap');
    }
    Common.Settings.Settings.instance()
        .moduleSetting('domWordWrap')
        .addChangeListener(this._domWordWrapSettingChanged.bind(this));

    crumbsContainer.id = 'elements-crumbs';
    if (this.domTreeButton) {
      this._accessibilityTreeView = new AccessibilityTreeView(this.domTreeButton);
    }
    this._breadcrumbs = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
    this._breadcrumbs.addEventListener('breadcrumbsnodeselected', (event: Common.EventTarget.EventTargetEvent) => {
      this._crumbNodeSelected(event);
    });

    crumbsContainer.appendChild(this._breadcrumbs);

    this._stylesWidget = StylesSidebarPane.instance();
    this._computedStyleWidget = new ComputedStyleWidget();
    this._metricsWidget = new MetricsSidebarPane();

    Common.Settings.Settings.instance()
        .moduleSetting('sidebarPosition')
        .addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    this._treeOutlines = new Set();
    this._treeOutlineHeaders = new Map();
    this._gridStyleTrackerByCSSModel = new Map();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DOMModel.DOMModel, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.NameChanged, event => this._targetNameChanged((event.data as SDK.Target.Target)));
    Common.Settings.Settings.instance()
        .moduleSetting('showUAShadowDOM')
        .addChangeListener(this._showUAShadowDOMChanged.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this._documentUpdatedEvent, this);
    Extensions.ExtensionServer.ExtensionServer.instance().addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);
    this._currentSearchResultIndex = -1;  // -1 represents the initial invalid state

    this._pendingNodeReveal = false;

    this._adornerManager = new ElementsComponents.AdornerManager.AdornerManager(
        Common.Settings.Settings.instance().moduleSetting('adornerSettings'));
    this._adornerSettingsPane = null;
    this._adornersByName = new Map();
  }

  _initializeFullAccessibilityTreeView(stackElement: UI.Widget.WidgetElement): void {
    this.accessibilityTreeButton = createAccessibilityTreeToggleButton(false);
    this.accessibilityTreeButton.addEventListener('click', this._showAccessibilityTree.bind(this));

    this.domTreeButton = createAccessibilityTreeToggleButton(true);
    this.domTreeButton.addEventListener('click', this._showDOMTree.bind(this));

    stackElement.appendChild(this.accessibilityTreeButton);
  }

  _showAccessibilityTree(): void {
    if (this._accessibilityTreeView) {
      this._splitWidget.setMainWidget(this._accessibilityTreeView);
    }
  }

  _showDOMTree(): void {
    // TODO(meredithl): Scroll to inspected DOM node.
    this._splitWidget.setMainWidget(this._searchableView);
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): ElementsPanel {
    const {forceNew} = opts;
    if (!elementsPanelInstance || forceNew) {
      elementsPanelInstance = new ElementsPanel();
    }

    return elementsPanelInstance;
  }

  _revealProperty(cssProperty: SDK.CSSProperty.CSSProperty): Promise<void> {
    if (!this.sidebarPaneView || !this._stylesViewToReveal) {
      return Promise.resolve();
    }

    return this.sidebarPaneView.showView(this._stylesViewToReveal).then(() => {
      this._stylesWidget.revealProperty((cssProperty as SDK.CSSProperty.CSSProperty));
    });
  }

  resolveLocation(_locationName: string): UI.View.ViewLocation|null {
    return this.sidebarPaneView || null;
  }

  showToolbarPane(widget: UI.Widget.Widget|null, toggle: UI.Toolbar.ToolbarToggle|null): void {
    // TODO(luoe): remove this function once its providers have an alternative way to reveal their views.
    this._stylesWidget.showToolbarPane(widget, toggle);
  }

  modelAdded(domModel: SDK.DOMModel.DOMModel): void {
    const parentModel = domModel.parentModel();

    // Different frames will have different DOMModels, we only want to add the accessibility model
    // for the top level frame, as the accessibility tree does not yet support exploring IFrames.
    if (!parentModel && this._accessibilityTreeView) {
      this._accessibilityTreeView.setAccessibilityModel(
          domModel.target().model(SDK.AccessibilityModel.AccessibilityModel));
    }
    let treeOutline: ElementsTreeOutline|null = parentModel ? ElementsTreeOutline.forDOMModel(parentModel) : null;
    if (!treeOutline) {
      treeOutline = new ElementsTreeOutline(true, true);
      treeOutline.setWordWrap(Common.Settings.Settings.instance().moduleSetting('domWordWrap').get());
      treeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
      treeOutline.addEventListener(
          ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
      new ElementsTreeElementHighlighter(treeOutline);
      this._treeOutlines.add(treeOutline);
      if (domModel.target().parentTarget()) {
        const element = document.createElement('div');
        element.classList.add('elements-tree-header');
        this._treeOutlineHeaders.set(treeOutline, element);
        this._targetNameChanged(domModel.target());
      }
    }
    treeOutline.wireToDOMModel(domModel);

    this._setupStyleTracking(domModel.cssModel());

    // Perform attach if necessary.
    if (this.isShowing()) {
      this.wasShown();
    }
  }

  modelRemoved(domModel: SDK.DOMModel.DOMModel): void {
    const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) {
      return;
    }

    treeOutline.unwireFromDOMModel(domModel);
    if (domModel.parentModel()) {
      return;
    }
    this._treeOutlines.delete(treeOutline);
    const header = this._treeOutlineHeaders.get(treeOutline);
    if (header) {
      header.remove();
    }
    this._treeOutlineHeaders.delete(treeOutline);
    treeOutline.element.remove();

    this._removeStyleTracking(domModel.cssModel());
  }

  _targetNameChanged(target: SDK.Target.Target): void {
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) {
      return;
    }
    const header = this._treeOutlineHeaders.get(treeOutline);
    if (!header) {
      return;
    }
    header.removeChildren();
    header.createChild('div', 'elements-tree-header-frame').textContent = i18nString(UIStrings.frame);
    header.appendChild(Components.Linkifier.Linkifier.linkifyURL(
        target.inspectedURL(), ({text: target.name()} as Components.Linkifier.LinkifyURLOptions)));
  }

  _updateTreeOutlineVisibleWidth(): void {
    if (!this._treeOutlines.size) {
      return;
    }

    let width = this._splitWidget.element.offsetWidth;
    if (this._splitWidget.isVertical()) {
      width -= this._splitWidget.sidebarSize();
    }
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setVisibleWidth(width);
    }
  }

  focus(): void {
    if (this._treeOutlines.size) {
      this._treeOutlines.values().next().value.focus();
    }
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this._searchableView;
  }

  wasShown(): void {
    UI.Context.Context.instance().setFlavor(ElementsPanel, this);

    for (const treeOutline of this._treeOutlines) {
      // Attach heavy component lazily
      if (treeOutline.element.parentElement !== this._contentElement) {
        const header = this._treeOutlineHeaders.get(treeOutline);
        if (header) {
          this._contentElement.appendChild(header);
        }
        this._contentElement.appendChild(treeOutline.element);
      }
    }
    super.wasShown();

    const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel);
    for (const domModel of domModels) {
      if (domModel.parentModel()) {
        continue;
      }
      const treeOutline = ElementsTreeOutline.forDOMModel(domModel);
      if (!treeOutline) {
        continue;
      }
      treeOutline.setVisible(true);

      if (!treeOutline.rootDOMNode) {
        if (domModel.existingDocument()) {
          treeOutline.rootDOMNode = domModel.existingDocument();
          this._documentUpdated(domModel);
        } else {
          domModel.requestDocument();
        }
      }
    }
  }

  willHide(): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setVisible(false);
      // Detach heavy component on hide
      this._contentElement.removeChild(treeOutline.element);
      const header = this._treeOutlineHeaders.get(treeOutline);
      if (header) {
        this._contentElement.removeChild(header);
      }
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(ElementsPanel, null);
  }

  onResize(): void {
    this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));  // Do not force layout.
    this._updateTreeOutlineVisibleWidth();
  }

  _selectedNodeChanged(event: Common.EventTarget.EventTargetEvent): void {
    let selectedNode: null|(SDK.DOMModel.DOMNode | null) = (event.data.node as SDK.DOMModel.DOMNode | null);

    // If the selectedNode is a pseudoNode, we want to ensure that it has a valid parentNode
    if (selectedNode && (selectedNode.pseudoType() && !selectedNode.parentNode)) {
      selectedNode = null;
    }
    const focus = (event.data.focus as boolean);
    for (const treeOutline of this._treeOutlines) {
      if (!selectedNode || ElementsTreeOutline.forDOMModel(selectedNode.domModel()) !== treeOutline) {
        treeOutline.selectDOMNode(null);
      }
    }

    if (selectedNode) {
      const activeNode = ElementsComponents.Helper.legacyNodeToElementsComponentsNode(selectedNode);
      const crumbs = [activeNode];

      for (let current: (SDK.DOMModel.DOMNode|null) = selectedNode.parentNode; current; current = current.parentNode) {
        crumbs.push(ElementsComponents.Helper.legacyNodeToElementsComponentsNode(current));
      }

      this._breadcrumbs.data = {
        crumbs,
        selectedNode: ElementsComponents.Helper.legacyNodeToElementsComponentsNode(selectedNode),
      };
    } else {
      this._breadcrumbs.data = {crumbs: [], selectedNode: null};
    }

    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, selectedNode);

    if (!selectedNode) {
      return;
    }
    selectedNode.setAsInspectedNode();
    if (this._accessibilityTreeView) {
      this._accessibilityTreeView.selectedNodeChanged(selectedNode);
    }
    if (focus) {
      this._selectedNodeOnReset = selectedNode;
      this._hasNonDefaultSelectedNode = true;
    }

    const executionContexts = selectedNode.domModel().runtimeModel().executionContexts();
    const nodeFrameId = selectedNode.frameId();
    for (const context of executionContexts) {
      if (context.frameId === nodeFrameId) {
        UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, context);
        break;
      }
    }
  }

  _documentUpdatedEvent(event: Common.EventTarget.EventTargetEvent): void {
    const domModel = (event.data as SDK.DOMModel.DOMModel);
    this._documentUpdated(domModel);
    this._removeStyleTracking(domModel.cssModel());
    this._setupStyleTracking(domModel.cssModel());
  }

  _documentUpdated(domModel: SDK.DOMModel.DOMModel): void {
    this._searchableView.resetSearch();

    if (!domModel.existingDocument()) {
      if (this.isShowing()) {
        domModel.requestDocument();
      }
      return;
    }

    this._hasNonDefaultSelectedNode = false;

    if (this._omitDefaultSelection) {
      return;
    }

    const savedSelectedNodeOnReset = this._selectedNodeOnReset;
    restoreNode.call(this, domModel, this._selectedNodeOnReset || null);

    async function restoreNode(
        this: ElementsPanel, domModel: SDK.DOMModel.DOMModel, staleNode: SDK.DOMModel.DOMNode|null): Promise<void> {
      const nodePath = staleNode ? staleNode.path() : null;
      const restoredNodeId = nodePath ? await domModel.pushNodeByPathToFrontend(nodePath) : null;

      if (savedSelectedNodeOnReset !== this._selectedNodeOnReset) {
        return;
      }
      let node: (SDK.DOMModel.DOMNode|null) = restoredNodeId ? domModel.nodeForId(restoredNodeId) : null;
      if (!node) {
        const inspectedDocument = domModel.existingDocument();
        node = inspectedDocument ? inspectedDocument.body || inspectedDocument.documentElement : null;
      }
      // If `node` is null here, the document hasn't been transmitted from the backend yet
      // and isn't in a valid state to have a default-selected node. Another document update
      // should be forthcoming. In the meantime, don't set the default-selected node or notify
      // the test that it's ready, because it isn't.
      if (node) {
        this._setDefaultSelectedNode(node);
        this._lastSelectedNodeSelectedForTest();
      }
    }
  }

  _lastSelectedNodeSelectedForTest(): void {
  }

  _setDefaultSelectedNode(node: SDK.DOMModel.DOMNode|null): void {
    if (!node || this._hasNonDefaultSelectedNode || this._pendingNodeReveal) {
      return;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline) {
      return;
    }
    this.selectDOMNode(node);
    if (treeOutline.selectedTreeElement) {
      treeOutline.selectedTreeElement.expand();
    }
  }

  searchCanceled(): void {
    this._searchConfig = undefined;
    this._hideSearchHighlights();

    this._searchableView.updateSearchMatchesCount(0);

    this._currentSearchResultIndex = -1;
    delete this._searchResults;

    SDK.DOMModel.DOMModel.cancelSearch();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    const query = searchConfig.query;

    const whitespaceTrimmedQuery = query.trim();
    if (!whitespaceTrimmedQuery.length) {
      return;
    }

    if (!this._searchConfig || this._searchConfig.query !== query) {
      this.searchCanceled();
    } else {
      this._hideSearchHighlights();
    }

    this._searchConfig = searchConfig;

    const showUAShadowDOM = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get();
    const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel);
    const promises = domModels.map(domModel => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
    Promise.all(promises).then(resultCounts => {
      this._searchResults = [];
      for (let i = 0; i < resultCounts.length; ++i) {
        const resultCount = resultCounts[i];
        for (let j = 0; j < resultCount; ++j) {
          this._searchResults.push({domModel: domModels[i], index: j, node: undefined});
        }
      }
      this._searchableView.updateSearchMatchesCount(this._searchResults.length);
      if (!this._searchResults.length) {
        return;
      }
      if (this._currentSearchResultIndex >= this._searchResults.length) {
        this._currentSearchResultIndex = -1;
      }

      let index: (0|- 1)|number = this._currentSearchResultIndex;

      if (shouldJump) {
        if (this._currentSearchResultIndex === -1) {
          index = jumpBackwards ? -1 : 0;
        } else {
          index = jumpBackwards ? index - 1 : index + 1;
        }
        this._jumpToSearchResult(index);
      }
    });
  }

  _domWordWrapSettingChanged(event: Common.EventTarget.EventTargetEvent): void {
    this._contentElement.classList.toggle('elements-wrap', (event.data as boolean));
    for (const treeOutline of this._treeOutlines) {
      treeOutline.setWordWrap((event.data as boolean));
    }
  }

  switchToAndFocus(node: SDK.DOMModel.DOMNode): void {
    // Reset search restore.
    this._searchableView.cancelSearch();
    UI.ViewManager.ViewManager.instance().showView('elements').then(() => this.selectDOMNode(node, true));
  }

  _jumpToSearchResult(index: number): void {
    if (!this._searchResults) {
      return;
    }

    this._currentSearchResultIndex = (index + this._searchResults.length) % this._searchResults.length;
    this._highlightCurrentSearchResult();
  }

  jumpToNextSearchResult(): void {
    if (!this._searchResults || !this._searchConfig) {
      return;
    }
    this.performSearch(this._searchConfig, true);
  }

  jumpToPreviousSearchResult(): void {
    if (!this._searchResults || !this._searchConfig) {
      return;
    }
    this.performSearch(this._searchConfig, true, true);
  }

  supportsCaseSensitiveSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  _highlightCurrentSearchResult(): void {
    const index = this._currentSearchResultIndex;
    const searchResults = this._searchResults;
    if (!searchResults) {
      return;
    }
    const searchResult = searchResults[index];

    this._searchableView.updateCurrentMatchIndex(index);
    if (searchResult.node === null) {
      return;
    }

    if (typeof searchResult.node === 'undefined') {
      // No data for slot, request it.
      searchResult.domModel.searchResult(searchResult.index).then(node => {
        searchResult.node = node;

        // If any of these properties are undefined or reset to an invalid value,
        // this means the search/highlight request is outdated.
        const highlightRequestValid =
            this._searchConfig && this._searchResults && (this._currentSearchResultIndex !== -1);
        if (highlightRequestValid) {
          this._highlightCurrentSearchResult();
        }
      });
      return;
    }

    const treeElement = this._treeElementForNode(searchResult.node);
    searchResult.node.scrollIntoView();
    if (treeElement) {
      this._searchConfig && treeElement.highlightSearchResults(this._searchConfig.query);
      treeElement.reveal();
      const matches = treeElement.listItemElement.getElementsByClassName(UI.UIUtils.highlightedSearchResultClassName);
      if (matches.length) {
        matches[0].scrollIntoViewIfNeeded(false);
      }
    }
    searchResult.node.highlight();
    this.selectDOMNode(searchResult.node);
  }

  _hideSearchHighlights(): void {
    if (!this._searchResults || !this._searchResults.length || this._currentSearchResultIndex === -1) {
      return;
    }
    const searchResult = this._searchResults[this._currentSearchResultIndex];
    if (!searchResult.node) {
      return;
    }
    const treeElement = this._treeElementForNode(searchResult.node);
    if (treeElement) {
      treeElement.hideSearchHighlights();
    }
  }

  selectedDOMNode(): SDK.DOMModel.DOMNode|null {
    for (const treeOutline of this._treeOutlines) {
      if (treeOutline.selectedDOMNode()) {
        return treeOutline.selectedDOMNode();
      }
    }
    return null;
  }

  selectDOMNode(node: SDK.DOMModel.DOMNode, focus?: boolean): void {
    for (const treeOutline of this._treeOutlines) {
      const outline = ElementsTreeOutline.forDOMModel(node.domModel());
      if (outline === treeOutline) {
        treeOutline.selectDOMNode(node, focus);
      } else {
        treeOutline.selectDOMNode(null);
      }
    }
  }

  _updateBreadcrumbIfNeeded(event: Common.EventTarget.EventTargetEvent): void {
    const nodes = (event.data as SDK.DOMModel.DOMNode[]);
    /* If we don't have a selected node then we can tell the breadcrumbs that & bail. */
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      this._breadcrumbs.data = {
        crumbs: [],
        selectedNode: null,
      };
      return;
    }

    /* This function gets called whenever the tree outline is updated
     * and contains any nodes that have changed.
     * What we need to do is construct the new set of breadcrumb nodes, combining the Nodes
     * that we had before with the new nodes, and pass them into the breadcrumbs component.
     */

    // Get the current set of active crumbs
    const activeNode = ElementsComponents.Helper.legacyNodeToElementsComponentsNode(selectedNode);
    const existingCrumbs = [activeNode];
    for (let current: (SDK.DOMModel.DOMNode|null) = selectedNode.parentNode; current; current = current.parentNode) {
      existingCrumbs.push(ElementsComponents.Helper.legacyNodeToElementsComponentsNode(current));
    }

    /* Get the change nodes from the event & convert them to breadcrumb nodes */
    const newNodes = nodes.map(ElementsComponents.Helper.legacyNodeToElementsComponentsNode);
    const nodesThatHaveChangedMap = new Map<number, ElementsComponents.Helper.DOMNode>();
    newNodes.forEach(crumb => nodesThatHaveChangedMap.set(crumb.id, crumb));

    /* Loop over our existing crumbs, and if any have an ID that matches an ID from the new nodes
     * that we have, use the new node, rather than the one we had, because it's changed.
     */
    const newSetOfCrumbs = existingCrumbs.map(crumb => {
      const replacement = nodesThatHaveChangedMap.get(crumb.id);
      return replacement || crumb;
    });

    this._breadcrumbs.data = {
      crumbs: newSetOfCrumbs,
      selectedNode: activeNode,
    };
  }

  _crumbNodeSelected(event: Common.EventTarget.EventTargetEvent): void {
    const node = (event.data as SDK.DOMModel.DOMNode);
    this.selectDOMNode(node, true);
  }

  _treeOutlineForNode(node: SDK.DOMModel.DOMNode|null): ElementsTreeOutline|null {
    if (!node) {
      return null;
    }
    return ElementsTreeOutline.forDOMModel(node.domModel());
  }

  _treeElementForNode(node: SDK.DOMModel.DOMNode): ElementsTreeElement|null {
    const treeOutline = this._treeOutlineForNode(node);
    if (!treeOutline) {
      return null;
    }
    return /** @type {?ElementsTreeElement} */ treeOutline.findTreeElement(node) as ElementsTreeElement | null;
  }

  _leaveUserAgentShadowDOM(node: SDK.DOMModel.DOMNode): SDK.DOMModel.DOMNode {
    let userAgentShadowRoot;
    while ((userAgentShadowRoot = node.ancestorUserAgentShadowRoot()) && userAgentShadowRoot.parentNode) {
      node = userAgentShadowRoot.parentNode;
    }
    return node;
  }

  revealAndSelectNode(node: SDK.DOMModel.DOMNode, focus: boolean, omitHighlight?: boolean): Promise<void> {
    this._omitDefaultSelection = true;

    node = Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get() ?
        node :
        this._leaveUserAgentShadowDOM(node);
    if (!omitHighlight) {
      node.highlightForTwoSeconds();
    }

    return UI.ViewManager.ViewManager.instance().showView('elements', false, !focus).then(() => {
      this.selectDOMNode(node, focus);
      delete this._omitDefaultSelection;

      if (!this._notFirstInspectElement) {
        ElementsPanel._firstInspectElementNodeNameForTest = node.nodeName();
        ElementsPanel._firstInspectElementCompletedForTest();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectElementCompleted();
      }
      this._notFirstInspectElement = true;
    });
  }

  _showUAShadowDOMChanged(): void {
    for (const treeOutline of this._treeOutlines) {
      treeOutline.update();
    }
  }

  _setupTextSelectionHack(stylePaneWrapperElement: HTMLElement): void {
    // We "extend" the sidebar area when dragging, in order to keep smooth text
    // selection. It should be replaced by 'user-select: contain' in the future.
    const uninstallHackBound = uninstallHack.bind(this);

    // Fallback to cover unforeseen cases where text selection has ended.
    const uninstallHackOnMousemove = (event: Event): void => {
      if ((event as MouseEvent).buttons === 0) {
        uninstallHack.call(this);
      }
    };

    stylePaneWrapperElement.addEventListener('mousedown', (event: Event) => {
      if ((event as MouseEvent).button !== 0) {
        return;
      }
      this._splitWidget.element.classList.add('disable-resizer-for-elements-hack');
      stylePaneWrapperElement.style.setProperty('height', `${stylePaneWrapperElement.offsetHeight}px`);
      const largeLength = 1000000;
      stylePaneWrapperElement.style.setProperty('left', `${- 1 * largeLength}px`);
      stylePaneWrapperElement.style.setProperty('padding-left', `${largeLength}px`);
      stylePaneWrapperElement.style.setProperty('width', `calc(100% + ${largeLength}px)`);
      stylePaneWrapperElement.style.setProperty('position', 'fixed');

      stylePaneWrapperElement.window().addEventListener('blur', uninstallHackBound);
      stylePaneWrapperElement.window().addEventListener('contextmenu', uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener('dragstart', uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener('mousemove', uninstallHackOnMousemove, true);
      stylePaneWrapperElement.window().addEventListener('mouseup', uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener('visibilitychange', uninstallHackBound);
    }, true);

    function uninstallHack(this: ElementsPanel): void {
      this._splitWidget.element.classList.remove('disable-resizer-for-elements-hack');
      stylePaneWrapperElement.style.removeProperty('left');
      stylePaneWrapperElement.style.removeProperty('padding-left');
      stylePaneWrapperElement.style.removeProperty('width');
      stylePaneWrapperElement.style.removeProperty('position');

      stylePaneWrapperElement.window().removeEventListener('blur', uninstallHackBound);
      stylePaneWrapperElement.window().removeEventListener('contextmenu', uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener('dragstart', uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener('mousemove', uninstallHackOnMousemove, true);
      stylePaneWrapperElement.window().removeEventListener('mouseup', uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener('visibilitychange', uninstallHackBound);
    }
  }

  _initializeSidebarPanes(splitMode: _splitMode): void {
    this._splitWidget.setVertical(splitMode === _splitMode.Vertical);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    const matchedStylePanesWrapper = new UI.Widget.VBox();
    matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._stylesWidget.show(matchedStylePanesWrapper.element);
    this._setupTextSelectionHack(matchedStylePanesWrapper.element);

    const computedStylePanesWrapper = new UI.Widget.VBox();
    computedStylePanesWrapper.element.classList.add('style-panes-wrapper');
    this._computedStyleWidget.show(computedStylePanesWrapper.element);

    const stylesSplitWidget = new UI.SplitWidget.SplitWidget(
        true /* isVertical */, true /* secondIsSidebar */, 'elements.styles.sidebar.width', 100);
    stylesSplitWidget.setMainWidget(matchedStylePanesWrapper);
    stylesSplitWidget.hideSidebar();
    stylesSplitWidget.enableShowModeSaving();
    stylesSplitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, () => {
      showMetricsWidgetInStylesPane();
    });
    this._stylesWidget.addEventListener(StylesSidebarPaneEvents.InitialUpdateCompleted, () => {
      this._stylesWidget.appendToolbarItem(stylesSplitWidget.createShowHideSidebarButton(
          i18nString(UIStrings.showComputedStylesSidebar), i18nString(UIStrings.hideComputedStylesSidebar)));
    });

    const showMetricsWidgetInComputedPane = (): void => {
      this._metricsWidget.show(computedStylePanesWrapper.element, this._computedStyleWidget.element);
      this._metricsWidget.toggleVisibility(true /* visible */);
      this._stylesWidget.removeEventListener(StylesSidebarPaneEvents.StylesUpdateCompleted, toggleMetricsWidget);
    };

    const showMetricsWidgetInStylesPane = (): void => {
      const showMergedComputedPane = stylesSplitWidget.showMode() === UI.SplitWidget.ShowMode.Both;
      if (showMergedComputedPane) {
        showMetricsWidgetInComputedPane();
      } else {
        this._metricsWidget.show(matchedStylePanesWrapper.element);
        if (!this._stylesWidget.hasMatchedStyles) {
          this._metricsWidget.toggleVisibility(false /* invisible */);
        }
        this._stylesWidget.addEventListener(StylesSidebarPaneEvents.StylesUpdateCompleted, toggleMetricsWidget);
      }
    };

    let skippedInitialTabSelectedEvent = false;

    const toggleMetricsWidget = (event: Common.EventTarget.EventTargetEvent): void => {
      this._metricsWidget.toggleVisibility(event.data.hasMatchedStyles);
    };

    const tabSelected = (event: Common.EventTarget.EventTargetEvent): void => {
      const tabId = (event.data.tabId as string);
      if (tabId === i18nString(UIStrings.computed)) {
        computedStylePanesWrapper.show(computedView.element);
        showMetricsWidgetInComputedPane();
      } else if (tabId === i18nString(UIStrings.styles)) {
        stylesSplitWidget.setSidebarWidget(computedStylePanesWrapper);
        showMetricsWidgetInStylesPane();
      }

      if (skippedInitialTabSelectedEvent) {
        // We don't log the initially selected sidebar pane to UMA because
        // it will skew the histogram heavily toward the Styles pane
        Host.userMetrics.sidebarPaneShown(tabId);
      } else {
        skippedInitialTabSelectedEvent = true;
      }
    };

    this.sidebarPaneView = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        () => UI.ViewManager.ViewManager.instance().showView('elements'));
    const tabbedPane = this.sidebarPaneView.tabbedPane();
    if (this._splitMode !== _splitMode.Vertical) {
      this._splitWidget.installResizer(tabbedPane.headerElement());
    }

    const stylesView = new UI.View.SimpleView(i18nString(UIStrings.styles));
    this.sidebarPaneView.appendView(stylesView);
    stylesView.element.classList.add('flex-auto');
    stylesSplitWidget.show(stylesView.element);

    const computedView = new UI.View.SimpleView(i18nString(UIStrings.computed));
    computedView.element.classList.add('composite', 'fill');

    tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, tabSelected, this);
    this.sidebarPaneView.appendView(computedView);
    this._stylesViewToReveal = stylesView;

    this.sidebarPaneView.appendApplicableItems('elements-sidebar');
    const extensionSidebarPanes = Extensions.ExtensionServer.ExtensionServer.instance().sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);
    }

    this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
  }

  _updateSidebarPosition(): void {
    if (this.sidebarPaneView && this.sidebarPaneView.tabbedPane().shouldHideOnDetach()) {
      return;
    }  // We can't reparent extension iframes.

    const position = Common.Settings.Settings.instance().moduleSetting('sidebarPosition').get();
    let splitMode = _splitMode.Horizontal;
    if (position === 'right' ||
        (position === 'auto' && UI.InspectorView.InspectorView.instance().element.offsetWidth > 680)) {
      splitMode = _splitMode.Vertical;
    }
    if (!this.sidebarPaneView) {
      this._initializeSidebarPanes(splitMode);
      return;
    }
    if (splitMode === this._splitMode) {
      return;
    }
    this._splitMode = splitMode;

    const tabbedPane = this.sidebarPaneView.tabbedPane();
    this._splitWidget.uninstallResizer(tabbedPane.headerElement());

    this._splitWidget.setVertical(this._splitMode === _splitMode.Vertical);
    this.showToolbarPane(null /* widget */, null /* toggle */);

    if (this._splitMode !== _splitMode.Vertical) {
      this._splitWidget.installResizer(tabbedPane.headerElement());
    }
  }

  _extensionSidebarPaneAdded(event: Common.EventTarget.EventTargetEvent): void {
    const pane = (event.data as Extensions.ExtensionPanel.ExtensionSidebarPane);
    this._addExtensionSidebarPane(pane);
  }

  _addExtensionSidebarPane(pane: Extensions.ExtensionPanel.ExtensionSidebarPane): void {
    if (this.sidebarPaneView && pane.panelName() === this.name) {
      this.sidebarPaneView.appendView(pane);
    }
  }

  getComputedStyleWidget(): ComputedStyleWidget {
    return this._computedStyleWidget;
  }

  _setupStyleTracking(cssModel: SDK.CSSModel.CSSModel): void {
    const gridStyleTracker = cssModel.createCSSPropertyTracker(TrackedCSSGridProperties);
    gridStyleTracker.start();
    this._gridStyleTrackerByCSSModel.set(cssModel, gridStyleTracker);
    gridStyleTracker.addEventListener(
        SDK.CSSModel.CSSPropertyTrackerEvents.TrackedCSSPropertiesUpdated, this._trackedCSSPropertiesUpdated, this);
  }

  _removeStyleTracking(cssModel: SDK.CSSModel.CSSModel): void {
    const gridStyleTracker = this._gridStyleTrackerByCSSModel.get(cssModel);
    if (!gridStyleTracker) {
      return;
    }

    gridStyleTracker.stop();
    this._gridStyleTrackerByCSSModel.delete(cssModel);
    gridStyleTracker.removeEventListener(
        SDK.CSSModel.CSSPropertyTrackerEvents.TrackedCSSPropertiesUpdated, this._trackedCSSPropertiesUpdated, this);
  }

  _trackedCSSPropertiesUpdated(event: Common.EventTarget.EventTargetEvent): void {
    const domNodes = (event.data.domNodes as (SDK.DOMModel.DOMNode | null)[]);

    for (const domNode of domNodes) {
      if (!domNode) {
        continue;
      }
      const treeElement = this._treeElementForNode(domNode);
      if (treeElement) {
        treeElement.updateStyleAdorners();
      }
    }
  }

  showAdornerSettingsPane(): void {
    // Delay the initialization of the pane to the first showing
    // since usually this pane won't be used.
    if (!this._adornerSettingsPane) {
      this._adornerSettingsPane = new ElementsComponents.AdornerSettingsPane.AdornerSettingsPane();
      this._adornerSettingsPane.addEventListener('adornersettingupdated', (event: Event) => {
        const {adornerName, isEnabledNow, newSettings} =
            (event as ElementsComponents.AdornerSettingsPane.AdornerSettingUpdatedEvent).data;
        const adornersToUpdate = this._adornersByName.get(adornerName);
        if (adornersToUpdate) {
          for (const adorner of adornersToUpdate) {
            isEnabledNow ? adorner.show() : adorner.hide();
          }
        }
        this._adornerManager.updateSettings(newSettings);
      });
      this._searchableView.element.prepend(this._adornerSettingsPane);
    }

    const adornerSettings = this._adornerManager.getSettings();
    this._adornerSettingsPane.data = {
      settings: adornerSettings,
    };
    this._adornerSettingsPane.show();
  }

  isAdornerEnabled(adornerText: string): boolean {
    return this._adornerManager.isAdornerEnabled(adornerText);
  }

  registerAdorner(adorner: Adorners.Adorner.Adorner): void {
    let adornerSet = this._adornersByName.get(adorner.name);
    if (!adornerSet) {
      adornerSet = new Set();
      this._adornersByName.set(adorner.name, adornerSet);
    }
    adornerSet.add(adorner);
    if (!this.isAdornerEnabled(adorner.name)) {
      adorner.hide();
    }
  }

  deregisterAdorner(adorner: Adorners.Adorner.Adorner): void {
    const adornerSet = this._adornersByName.get(adorner.name);
    if (!adornerSet) {
      return;
    }
    adornerSet.delete(adorner);
  }

  static _firstInspectElementCompletedForTest = function(): void {};
  static _firstInspectElementNodeNameForTest = '';
}

// @ts-ignore exported for Tests.js
globalThis.Elements = globalThis.Elements || {};
// @ts-ignore exported for Tests.js
globalThis.Elements.ElementsPanel = ElementsPanel;

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export const enum _splitMode {
  Vertical = 'Vertical',
  Horizontal = 'Horizontal',
}

const TrackedCSSGridProperties = [
  {
    name: 'display',
    value: 'grid',
  },
  {
    name: 'display',
    value: 'inline-grid',
  },
  {
    name: 'display',
    value: 'flex',
  },
  {
    name: 'display',
    value: 'inline-flex',
  },
];

let contextMenuProviderInstance: ContextMenuProvider;

export class ContextMenuProvider implements UI.ContextMenu.Provider {
  appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, object: Object): void {
    if (!(object instanceof SDK.RemoteObject.RemoteObject && (object as SDK.RemoteObject.RemoteObject).isNode()) &&
        !(object instanceof SDK.DOMModel.DOMNode) && !(object instanceof SDK.DOMModel.DeferredDOMNode)) {
      return;
    }
    if (ElementsPanel.instance().element.isAncestor((event.target as Node))) {
      return;
    }
    const commandCallback: () => void = Common.Revealer.reveal.bind(Common.Revealer.Revealer, object);
    contextMenu.revealSection().appendItem(i18nString(UIStrings.revealInElementsPanel), commandCallback);
  }

  static instance(): ContextMenuProvider {
    if (!contextMenuProviderInstance) {
      contextMenuProviderInstance = new ContextMenuProvider();
    }
    return contextMenuProviderInstance;
  }
}
let dOMNodeRevealerInstance: DOMNodeRevealer;
export class DOMNodeRevealer implements Common.Revealer.Revealer {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): DOMNodeRevealer {
    const {forceNew} = opts;
    if (!dOMNodeRevealerInstance || forceNew) {
      dOMNodeRevealerInstance = new DOMNodeRevealer();
    }

    return dOMNodeRevealerInstance;
  }

  reveal(node: Object, omitFocus?: boolean): Promise<void> {
    const panel = ElementsPanel.instance();
    panel._pendingNodeReveal = true;

    return new Promise(revealPromise);

    function revealPromise(resolve: () => void, reject: (arg0: Error) => void): void {
      if (node instanceof SDK.DOMModel.DOMNode) {
        onNodeResolved((node as SDK.DOMModel.DOMNode));
      } else if (node instanceof SDK.DOMModel.DeferredDOMNode) {
        (node as SDK.DOMModel.DeferredDOMNode).resolve(checkDeferredDOMNodeThenReveal);
      } else if (node instanceof SDK.RemoteObject.RemoteObject) {
        const domModel =
            /** @type {!SDK.RemoteObject.RemoteObject} */ (node as SDK.RemoteObject.RemoteObject)
                .runtimeModel()
                .target()
                .model(SDK.DOMModel.DOMModel);
        if (domModel) {
          domModel.pushObjectAsNodeToFrontend(node).then(checkRemoteObjectThenReveal);
        } else {
          reject(new Error('Could not resolve a node to reveal.'));
        }
      } else {
        reject(new Error('Can\'t reveal a non-node.'));
        panel._pendingNodeReveal = false;
      }

      function onNodeResolved(resolvedNode: SDK.DOMModel.DOMNode): void {
        panel._pendingNodeReveal = false;

        // A detached node could still have a parent and ownerDocument
        // properties, which means stepping up through the hierarchy to ensure
        // that the root node is the document itself. Any break implies
        // detachment.
        let currentNode: SDK.DOMModel.DOMNode = resolvedNode;
        while (currentNode.parentNode) {
          currentNode = currentNode.parentNode;
        }
        const isDetached = !(currentNode instanceof SDK.DOMModel.DOMDocument);

        const isDocument = node instanceof SDK.DOMModel.DOMDocument;
        if (!isDocument && isDetached) {
          const msg = i18nString(UIStrings.nodeCannotBeFoundInTheCurrent);
          Common.Console.Console.instance().warn(msg);
          reject(new Error(msg));
          return;
        }

        if (resolvedNode) {
          panel.revealAndSelectNode(resolvedNode, !omitFocus).then(resolve);
          return;
        }
        reject(new Error('Could not resolve node to reveal.'));
      }

      function checkRemoteObjectThenReveal(resolvedNode: SDK.DOMModel.DOMNode|null): void {
        if (!resolvedNode) {
          const msg = i18nString(UIStrings.theRemoteObjectCouldNotBe);
          Common.Console.Console.instance().warn(msg);
          reject(new Error(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }

      function checkDeferredDOMNodeThenReveal(resolvedNode: SDK.DOMModel.DOMNode|null): void {
        if (!resolvedNode) {
          const msg = i18nString(UIStrings.theDeferredDomNodeCouldNotBe);
          Common.Console.Console.instance().warn(msg);
          reject(new Error(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }
    }
  }
}

let cSSPropertyRevealerInstance: CSSPropertyRevealer;

export class CSSPropertyRevealer implements Common.Revealer.Revealer {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CSSPropertyRevealer {
    const {forceNew} = opts;
    if (!cSSPropertyRevealerInstance || forceNew) {
      cSSPropertyRevealerInstance = new CSSPropertyRevealer();
    }

    return cSSPropertyRevealerInstance;
  }

  reveal(property: Object): Promise<void> {
    const panel = ElementsPanel.instance();
    return panel._revealProperty((property as SDK.CSSProperty.CSSProperty));
  }
}

let elementsActionDelegateInstance: ElementsActionDelegate;

export class ElementsActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return true;
    }
    const treeOutline = ElementsTreeOutline.forDOMModel(node.domModel());
    if (!treeOutline) {
      return true;
    }

    switch (actionId) {
      case 'elements.hide-element':
        treeOutline.toggleHideElement(node);
        return true;
      case 'elements.edit-as-html':
        treeOutline.toggleEditAsHTML(node);
        return true;
      case 'elements.duplicate-element':
        treeOutline.duplicateNode(node);
        return true;
      case 'elements.copy-styles':
        treeOutline.findTreeElement(node)?._copyStyles();
        return true;
      case 'elements.undo':
        SDK.DOMModel.DOMModelUndoStack.instance().undo();
        ElementsPanel.instance()._stylesWidget.forceUpdate();
        return true;
      case 'elements.redo':
        SDK.DOMModel.DOMModelUndoStack.instance().redo();
        ElementsPanel.instance()._stylesWidget.forceUpdate();
        return true;
    }
    return false;
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): ElementsActionDelegate {
    const {forceNew} = opts;
    if (!elementsActionDelegateInstance || forceNew) {
      elementsActionDelegateInstance = new ElementsActionDelegate();
    }

    return elementsActionDelegateInstance;
  }
}

let pseudoStateMarkerDecoratorInstance: PseudoStateMarkerDecorator;
export class PseudoStateMarkerDecorator implements MarkerDecorator {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): PseudoStateMarkerDecorator {
    const {forceNew} = opts;
    if (!pseudoStateMarkerDecoratorInstance || forceNew) {
      pseudoStateMarkerDecoratorInstance = new PseudoStateMarkerDecorator();
    }

    return pseudoStateMarkerDecoratorInstance;
  }

  decorate(node: SDK.DOMModel.DOMNode): {
    title: string,
    color: string,
  }|null {
    const pseudoState = node.domModel().cssModel().pseudoState(node);
    if (!pseudoState) {
      return null;
    }

    return {color: 'orange', title: i18nString(UIStrings.elementStateS, {PH1: ':' + pseudoState.join(', :')})};
  }
}
