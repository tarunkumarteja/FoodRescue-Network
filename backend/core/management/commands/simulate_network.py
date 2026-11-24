from django.core.management.base import BaseCommand
from core.simulation import run_network_simulation


class Command(BaseCommand):
    help = 'Runs FoodRescue Network multi-agent simulation and benchmarking suite'

    def add_arguments(self, parser):
        parser.add_argument(
            '--donors',
            type=int,
            default=5,
            help='Number of simulated food donor entities (default: 5)'
        )
        parser.add_argument(
            '--recipients',
            type=int,
            default=8,
            help='Number of simulated recipient organizations (default: 8)'
        )
        parser.add_argument(
            '--listings',
            type=int,
            default=12,
            help='Number of surplus food listings to generate (default: 12)'
        )

    def handle(self, *args, **options):
        num_donors = options['donors']
        num_recipients = options['recipients']
        num_listings = options['listings']

        self.stdout.write(self.style.NOTICE("=" * 70))
        self.stdout.write(self.style.NOTICE(f"  Starting FoodRescue Network Simulation & Benchmarking"))
        self.stdout.write(self.style.NOTICE(f"  Donors: {num_donors} | Recipients: {num_recipients} | Listings: {num_listings}"))
        self.stdout.write(self.style.NOTICE("=" * 70))

        result = run_network_simulation(
            num_donors=num_donors,
            num_recipients=num_recipients,
            num_listings=num_listings
        )

        metrics = result['metrics']

        self.stdout.write(self.style.SUCCESS(f"\n[OK] Simulation completed successfully in {metrics['execution_duration_ms']} ms!"))
        self.stdout.write(f"  * Run ID:                          {result['run_id']}")
        self.stdout.write(f"  * Total Donations Generated:       {metrics['num_listings_generated']} ({metrics['total_packets_listed']} packets)")
        self.stdout.write(f"  * Successful Matches:              {metrics['successful_matches']} / {metrics['num_listings_generated']} ({metrics['match_rate_pct']}%)")
        self.stdout.write(f"  * Average Time to Claim:           {metrics['avg_time_to_claim_minutes']} minutes ({metrics['avg_time_to_claim_seconds']}s)")
        self.stdout.write(f"  * Pickups Completed:               {metrics['completed_pickups']}")
        self.stdout.write(f"  * Cancelled Pickups:               {metrics['cancelled_pickups']} (Inventory automatically restored)")
        self.stdout.write(f"  * Total Quantity Distributed:      {metrics['total_quantity_distributed_packets']} packets")
        self.stdout.write(f"  * CO2 Emissions Prevented:         {metrics['co2_emissions_prevented_kg']} kg")
        self.stdout.write(f"  * Concurrency Integrity:           {metrics['atomic_concurrency_integrity']}")
        self.stdout.write(self.style.NOTICE("=" * 70 + "\n"))
