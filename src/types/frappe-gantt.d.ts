declare module "frappe-gantt" {
  interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    custom_class?: string;
    dependencies?: string;
  }

  interface GanttOptions {
    view_mode?: "Quarter Day" | "Half Day" | "Day" | "Week" | "Month" | "Year";
    language?: string;
    readonly?: boolean;
  }

  class Gantt {
    constructor(wrapper: HTMLElement | string, tasks: GanttTask[], options?: GanttOptions);
  }

  export default Gantt;
}
