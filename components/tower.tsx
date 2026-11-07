import Link from "next/link";
import { dayLabel, money, timeLabel } from "@/lib/format";
import type { TowerRow } from "@/lib/read-models";

/** The hero's picture: the tower itself, as live HTML. It runs no floor code. */
export function TowerStack({ rows }: { rows: TowerRow[] }) {
  const floors = rows.filter((row) => row.kind !== "window-close").slice(0, 9);
  return (
    <div className="tower">
      {floors.map((row, index) => {
        if (row.kind === "lit") {
          return (
            <Link key={row.slug} className="tower__floor tower__floor--lit" href={`/floors/${row.slug}`}>
              <span className="tower__num">{row.slug}</span>
              <span className="tower__name">{row.name}</span>
              <span className="tower__state">{dayLabel(row.day)}</span>
            </Link>
          );
        }
        if (row.kind === "dark") {
          return (
            <Link key={row.slug} className="tower__floor tower__floor--dark" href={`/shifts/${row.slug}`}>
              <span className="tower__num">{row.slug}</span>
              <span className="tower__name">Stayed dark</span>
              <span className="tower__state">{dayLabel(row.day)}</span>
            </Link>
          );
        }
        if (row.kind === "tonight") {
          return (
            <Link key="tonight" className="tower__floor tower__floor--tonight" href="/vote">
              <span className="tower__num">{row.slug}</span>
              <span className="tower__name">Tonight&rsquo;s floor</span>
              <span className="tower__state">{timeLabel(row.closesAt)}</span>
            </Link>
          );
        }
        if (row.kind === "upcoming") {
          return (
            <div key={`up-${index}`} className="tower__floor tower__floor--upcoming">
              <span className="tower__num"></span>
              <span className="tower__name">Not built yet</span>
              <span className="tower__state">{dayLabel(row.day)}</span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function FloorRow({ row, index }: { row: TowerRow; index: number }) {
  if (row.kind === "lit") {
    return (
      <li>
        <Link className="floor-rows__row floor-rows__row--lit" href={`/floors/${row.slug}`}>
          <span className="floor-rows__who">Floor {row.slug}</span>
          <span className="floor-rows__sub">{row.name} · {money(row.costCents)}{row.label === "off-schedule" ? " · off-schedule" : ""}</span>
          <span className="floor-rows__chip">Lit</span>
        </Link>
      </li>
    );
  }
  if (row.kind === "dark") {
    return (
      <li>
        <Link className="floor-rows__row floor-rows__row--muted" href={`/shifts/${row.slug}`}>
          <span className="floor-rows__who">Floor {row.slug}</span>
          <span className="floor-rows__sub">{row.reason}{row.label === "off-schedule" ? " · off-schedule" : ""}</span>
          <span className="floor-rows__chip">Dark</span>
        </Link>
      </li>
    );
  }
  if (row.kind === "tonight") {
    return (
      <li>
        <Link className="floor-rows__row" href="/vote">
          <span className="floor-rows__who">Floor {row.slug}</span>
          <span className="floor-rows__sub">Closes {timeLabel(row.closesAt)} · {row.wallets} {row.wallets === 1 ? "wallet" : "wallets"} so far</span>
          <span className="floor-rows__chip">Tonight</span>
        </Link>
      </li>
    );
  }
  if (row.kind === "window-close") {
    return <li className="floor-rows__row floor-rows__row--window"><span></span><span>Build window closes {dayLabel(row.at)}, {timeLabel(row.at)}</span><span></span></li>;
  }
  return (
    <li className="floor-rows__row floor-rows__row--muted" key={index}>
      <span className="floor-rows__who"></span>
      <span className="floor-rows__sub">Not built yet</span>
      <span className="floor-rows__chip">{dayLabel(row.day)}</span>
    </li>
  );
}

export function FloorList({ rows }: { rows: TowerRow[] }) {
  return (
    <ul className="floor-rows">
      {rows.map((row, index) => <FloorRow key={index} row={row} index={index} />)}
    </ul>
  );
}
