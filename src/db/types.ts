export type BindValue = string | number | null
export type BindParams = BindValue[]

export interface DatabaseConnection {
  execute(sql: string, bindValues?: BindParams): Promise<{ rowsAffected: number }>
  select<T>(sql: string, bindValues?: BindParams): Promise<T[]>
  close(): Promise<void>
}
