import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

interface DatePickerWithRangeProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
}: DatePickerWithRangeProps) {

  const handleSelect = (newDate: DateRange | undefined) => {
    if (!newDate) {
      onDateChange(undefined)
      return
    }

    // If we're starting fresh or both dates are already set, start a new selection
    if (!date || (date.from && date.to)) {
      onDateChange({ from: newDate.from, to: undefined })
    } else if (date.from && !date.to && newDate.from) {
      // We have a start date but no end date, so set the end date
      if (newDate.from >= date.from) {
        onDateChange({ from: date.from, to: newDate.from })
      } else {
        // If the new date is before the start date, reset
        onDateChange({ from: newDate.from, to: undefined })
      }
    } else {
      onDateChange(newDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM d, yyyy")} -{" "}
                  {format(date.to, "MMM d, yyyy")}
                </>
              ) : (
                format(date.from, "MMM d, yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
