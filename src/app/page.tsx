import IngresoHogar from '@/components/IngresoHogar'
import CategoriasHogar from '@/components/CategoriasHogar'
import TarjetasCredito from '@/components/TarjetasCredito'
import MetasAhorro from '@/components/MetasAhorro'
import RegistrarGasto from '@/components/RegistrarGasto'
import MovimientosRecientes from '@/components/MovimientosRecientes'

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 p-8">
      <IngresoHogar />
      <CategoriasHogar />
      <TarjetasCredito />
      <MetasAhorro />
      <RegistrarGasto />
      <MovimientosRecientes />
    </div>
  )
}