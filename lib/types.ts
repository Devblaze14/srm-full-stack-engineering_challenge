export type EdgeTree = { [label: string]: EdgeTree };

export interface HierarchyItem {
  root: string;
  tree: EdgeTree;
  depth?: number;
  has_cycle?: true;
}

export interface SummaryInfo {
  total_trees: number;
  total_cycles: number;
  largest_tree_root: string;
}

export interface BfhlPayload {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: HierarchyItem[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: SummaryInfo;
}
