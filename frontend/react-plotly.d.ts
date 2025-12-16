declare module 'react-plotly.js' {
  import { Component } from 'react';
  import * as Plotly from 'plotly.js';

  export interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];
    onClick?: (event: Plotly.PlotMouseEvent) => void;
    onHover?: (event: Plotly.PlotHoverEvent) => void;
    onUnhover?: (event: Plotly.PlotMouseEvent) => void;
    onSelected?: (event: Plotly.PlotSelectionEvent) => void;
    onRelayout?: (event: Plotly.PlotRelayoutEvent) => void;
    onUpdate?: (figure: Readonly<Plotly.Figure>, graphDiv: Readonly<HTMLElement>) => void;
    onInitialized?: (figure: Readonly<Plotly.Figure>, graphDiv: Readonly<HTMLElement>) => void;
    onPurge?: (figure: Readonly<Plotly.Figure>, graphDiv: Readonly<HTMLElement>) => void;
    onError?: (err: Error) => void;
    useResizeHandler?: boolean;
    style?: React.CSSProperties;
    className?: string;
    divId?: string;
    revision?: number;
    debug?: boolean;
  }

  export default class Plot extends Component<PlotParams> {}
}

