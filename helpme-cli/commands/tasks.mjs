import chalk from "chalk";
import { getTaskCollections } from "../../server/db/app-queries.mjs";
import { tasksTable } from "../render/table.mjs";
import { header } from "../render/box.mjs";

export async function handleTasks() {
  const collections = getTaskCollections();
  const total = collections.today.length + collections.inbox.length + collections.open.length + collections.done.length;

  const lines = [
    header(
      `📋  TASKS`,
      `Today: ${collections.today.length}  Inbox: ${collections.inbox.length}  Open: ${collections.open.length}  Done: ${collections.done.length} (tổng ${total})`
    ),
    "",
    tasksTable(collections)
  ];

  return lines.join("\n");
}
